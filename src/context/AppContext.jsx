import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  STUDENTS,
  TASKS,
  SUBMISSIONS,
  NOTIFICATIONS_STUDENT,
  NOTIFICATIONS_ADMIN,
  getStudentById as getMockStudentById,
  getTaskById as getMockTaskById,
} from "../data/mockData";
import supabase, { isSupabaseConfigured } from "../supabaseClient";
import {
  loginUser,
  signUpUser,
  fetchTasks as fetchDbTasks,
  createTask as createDbTask,
  submitTask as submitDbTask,
} from "../hooks/useNexura";
import { normalizeRole } from "../lib/roleGuard";

const AppContext = createContext(null);

// Use crypto.randomUUID() for unique IDs that survive HMR. The old
// module-level counter reset on every hot reload, producing duplicate keys
// in React lists.
const nextId = (prefix) => `${prefix}_${crypto.randomUUID()}`;

// Real Supabase users have UUID ids; demo/local fallback users do not.
const isDbUuid = (value = "") =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value),
  );

// Demo/local sessions have no real join date. Persist the first-seen date per
// email so "Member since" stays stable across sessions instead of showing the
// current date, which visibly churns day to day (e.g. Sept 30 -> Oct 1).
const DEFAULT_JOINED = "2024-08-12";
const getLocalJoinedDate = (email = "") => {
  try {
    const key = `nexura_local_joined:${String(email).toLowerCase()}`;
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(key, today);
    return today;
  } catch {
    return DEFAULT_JOINED;
  }
};

const normalizeTask = (row, fallbackStudentIds = []) => {
  const assigned =
    Array.isArray(row.assignedTo) && row.assignedTo.length > 0
      ? row.assignedTo
      : Array.isArray(row.assigned_to) && row.assigned_to.length > 0
        ? row.assigned_to
        : fallbackStudentIds.length > 0
          ? fallbackStudentIds
          : STUDENTS.map((s) => s.id);

  return {
    id: row.id,
    title: row.title || "Untitled task",
    category: row.category || "Web Development",
    description: row.description || "",
    requirements: Array.isArray(row.requirements) ? row.requirements : [],
    deadline: row.deadline
      ? new Date(row.deadline).toISOString().slice(0, 10)
      : "2026-09-30",
    createdAt: row.created_at
      ? new Date(row.created_at).toISOString().slice(0, 10)
      : "2026-09-01",
    difficulty: row.difficulty || "Intermediate",
    points: Number(row.points || 100),
    assignedTo: assigned,
  };
};

const normalizeSubmission = (row) => ({
  id: row.id,
  taskId: row.task_id || row.taskId,
  studentId: row.student_id || row.studentId,
  status: row.status || "pending",
  submittedAt: row.created_at || row.submittedAt || new Date().toISOString(),
  fileName: row.file_url ? row.file_url.split("/").pop() : row.fileName || "",
  githubUrl: row.github_url || row.githubUrl || "",
  liveUrl: row.live_url || row.liveUrl || "",
  notes: row.notes || row.note || "",
  feedback: row.feedback || "",
  reviewedAt: row.reviewed_at || row.reviewedAt || null,
  attempt: row.attempt || 1,
});

const fetchCurrentProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  } catch (err) {
    console.warn("fetchCurrentProfile failed:", err);
    return null;
  }
};

const safeSupabaseQuery = async (queryBuilder, fallback = { data: null }) => {
  try {
    const result = await queryBuilder;
    return result ?? fallback;
  } catch (error) {
    console.warn("Supabase query failed:", error);
    return fallback;
  }
};

const buildAuthState = (user, profile) => {
  // The database profile is the single source of truth for the role. Never
  // trust user_metadata.role — it is client-supplied at signup and could be
  // forged to request coordinator access.
  const role = normalizeRole(profile?.role || "student");
  return {
    role,
    user: {
      id: user.id,
      email: user.email,
      name:
        profile?.name || user.user_metadata?.name || user.email.split("@")[0],
      role,
      avatarColor: role === "coordinator" ? "#5B21B6" : "#7C3AED",
      rollNo: profile?.roll_no || "CS21B045",
      branch: profile?.branch || "Computer Science",
      year: profile?.year || "3rd Year",
      joined: profile?.created_at
        ? new Date(profile.created_at).toISOString().slice(0, 10)
        : "2024-08-12",
    },
  };
};

export function AppProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [students, setStudents] = useState(STUDENTS);
  const [tasks, setTasks] = useState(TASKS);
  const [submissions, setSubmissions] = useState(SUBMISSIONS);
  const [studentNotifs, setStudentNotifs] = useState(NOTIFICATIONS_STUDENT);
  const [adminNotifs, setAdminNotifs] = useState(NOTIFICATIONS_ADMIN);
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((message, type = "success") => {
    const id = nextId("toast");
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const syncLiveData = useCallback(async () => {
    try {
      const [taskRows, profileRows, submissionRows] = await Promise.all([
        fetchDbTasks().catch(() => []),
        safeSupabaseQuery(
          supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false }),
        ),
        safeSupabaseQuery(
          supabase
            .from("submissions")
            .select("*")
            .order("created_at", { ascending: false }),
        ),
      ]);

      // When a real Supabase backend is configured, use ONLY DB data.
      // Mock data is only shown in local/demo mode (noop client).
      let liveStudents = [];
      if (isSupabaseConfigured && profileRows?.data && profileRows.data.length > 0) {
        liveStudents = profileRows.data
          .filter((p) => p.role === "student" || !p.role || p.role === "")
          .map((p) => ({
            id: p.id,
            name: p.name || p.email?.split("@")[0] || "Student User",
            email: p.email || "",
            role: p.role || "student",
            rollNo:
              p.roll_no ||
              p.rollNo ||
              `CS21B${String(p.id).slice(0, 3).toUpperCase()}`,
            branch: p.branch || "Computer Science",
            year: p.year || "3rd Year",
            avatarColor: "#7C3AED",
            joined: p.created_at
              ? new Date(p.created_at).toISOString().slice(0, 10)
              : "2024-08-12",
          }));
      } else if (!isSupabaseConfigured) {
        // Demo mode: use mock data only.
        liveStudents = [...STUDENTS];
      }

      if (auth?.user) {
        const userInList = liveStudents.find((s) => s.id === auth.user.id);
        if (!userInList && auth.user.role === "student") {
          liveStudents.unshift(auth.user);
        } else if (userInList) {
          Object.assign(userInList, {
            name: auth.user.name || userInList.name,
            email: auth.user.email || userInList.email,
          });
        }
      }

      setStudents(liveStudents);

      const allStudentIds = liveStudents.map((s) => s.id);

      if (isSupabaseConfigured) {
        // Real backend: use ONLY DB data. If the DB returns empty arrays,
        // set empty state — never fall back to mock data.
        const dbTasks = taskRows?.length > 0
          ? taskRows.map((t) => normalizeTask(t, allStudentIds))
          : [];
        setTasks(dbTasks);

        const dbSubs = submissionRows?.data?.length > 0
          ? submissionRows.data.map(normalizeSubmission)
          : [];
        setSubmissions(dbSubs);
      } else {
        // Demo mode: use mock data only.
        setTasks(TASKS);
        setSubmissions(SUBMISSIONS);
      }

      // Persistent notifications (real Supabase users only — demo/local
      // sessions keep the seeded mock notifications).
      if (auth?.user && isDbUuid(auth.user.id)) {
        const notifResult = await safeSupabaseQuery(
          supabase
            .from("notifications")
            .select("*")
            .eq("user_id", auth.user.id)
            .order("created_at", { ascending: false })
            .limit(50),
        );
        if (Array.isArray(notifResult?.data)) {
          const dbNotifs = notifResult.data.map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            link: n.link,
            read: n.read,
            time: n.created_at,
          }));
          if (normalizeRole(auth.user.role) === "coordinator") {
            setAdminNotifs(dbNotifs);
          } else {
            setStudentNotifs(dbNotifs);
          }
        }
      }
    } catch (error) {
      console.warn("Supabase sync failed, using current state.", error);
    }
  }, [auth?.user]);

  const commitAuth = useCallback((nextAuthState) => {
    setAuth((prev) => {
      if (
        prev &&
        prev.user &&
        nextAuthState?.user &&
        JSON.stringify(prev.user) === JSON.stringify(nextAuthState.user)
      ) {
        // Same session/profile content: keep the previous object identity.
        // Otherwise derived callbacks (e.g. syncLiveData, keyed off
        // auth.user) change identity, re-running the bootstrap effect, which
        // re-subscribes to onAuthStateChange and replays INITIAL_SESSION,
        // producing an infinite refetch/request loop (ERR_INSUFFICIENT_RESOURCES).
        return prev;
      }
      return nextAuthState;
    });
  }, []);

  const hydrateAuthFromUser = useCallback(
    async (user) => {
      if (!user) {
        setAuth(null);
        return;
      }

      try {
        const profile = await fetchCurrentProfile(user.id);
        commitAuth(buildAuthState(user, profile));
      } catch (error) {
        console.warn("Profile hydration failed", error);
        commitAuth({
          role: "student",
          user: {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email.split("@")[0],
            role: "student",
            avatarColor: "#7C3AED",
            rollNo: "CS21B045",
            branch: "Computer Science",
            year: "3rd Year",
            joined: "2024-08-12",
          },
        });
      }
    },
    [commitAuth],
  );

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const sessionRes = supabase?.auth?.getSession
          ? await supabase.auth
              .getSession()
              .catch(() => ({ data: { session: null } }))
          : { data: { session: null } };
        const session = sessionRes?.data?.session;

        if (active && session?.user) {
          await hydrateAuthFromUser(session.user);
        }

        if (active) {
          await syncLiveData();
        }
      } catch (error) {
        console.warn("Session bootstrap failed", error);
      }
    };

    bootstrap();

    let channel = null;
    let pollTimer = null;
    let joinCheckTimer = null;

    // Live-refresh via Supabase Realtime. Each listener is registered as its
    // own statement instead of chaining `.on(...)` calls: the post-deployment
    // bundle threw "TypeError: ...channel(...).on(...).on is not a function"
    // whenever the bundled @supabase/realtime-js `.on()` did not return a
    // chainable channel (dependency version drift at build/deploy time).
    // Calling `.on()` per statement only relies on listener side effects, and
    // the feature checks + try/catch make realtime failures degrade to the
    // polling fallback instead of crashing the app bootstrap.
    const setupRealtime = () => {
      if (typeof supabase?.channel !== "function") return;

      try {
        const realtimeChannel = supabase.channel("nexura-realtime-sync");
        if (typeof realtimeChannel?.on !== "function") return;

        const onTableChange = (table) => {
          realtimeChannel.on(
            "postgres_changes",
            { event: "*", schema: "public", table },
            () => {
              if (active) syncLiveData();
            },
          );
        };

        onTableChange("tasks");
        onTableChange("submissions");
        onTableChange("profiles");
        onTableChange("notifications");

        let joined = false;
        const startFallbackPolling = () => {
          if (pollTimer || !active) return;
          pollTimer = setInterval(() => {
            if (active) syncLiveData();
          }, 25000);
        };

        if (typeof realtimeChannel.subscribe === "function") {
          realtimeChannel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              joined = true;
              if (pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
              }
            } else if (
              status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT" ||
              status === "CLOSED"
            ) {
              startFallbackPolling();
            }
          });
        }
        channel = realtimeChannel;

        // If the realtime socket never confirms within 6s (e.g. the project
        // has realtime disabled), fall back to polling so data and
        // notifications still refresh in other sessions.
        joinCheckTimer = setTimeout(() => {
          if (!joined && active) startFallbackPolling();
        }, 6000);
      } catch (error) {
        console.warn("Realtime sync setup failed:", error);
      }
    };

    setupRealtime();

    if (!channel) {
      // Realtime channel unavailable: keep live data fresh via polling.
      pollTimer = setInterval(() => {
        if (active) syncLiveData();
      }, 25000);
    }

    let subscription = null;
    if (supabase?.auth?.onAuthStateChange) {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!active) return;

          try {
            if (session?.user) {
              await hydrateAuthFromUser(session.user);
            } else if (event === "SIGNED_OUT") {
              // Logout can also arrive as an auth event from another open tab
              // (auth-js broadcasts across tabs). Clear React state so
              // ProtectedRoute redirects to /login instead of leaving a ghost
              // logged-in UI.
              setAuth(null);
            }
            await syncLiveData();
          } catch (error) {
            console.warn("Auth change sync failed", error);
          }
        },
      );
      subscription = data?.subscription ?? null;
    }

    return () => {
      active = false;
      if (pollTimer) clearInterval(pollTimer);
      if (joinCheckTimer) clearTimeout(joinCheckTimer);
      if (subscription && typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
      if (channel && typeof channel.unsubscribe === "function") {
        channel.unsubscribe();
      }
    };
  }, [hydrateAuthFromUser, syncLiveData]);

  const login = useCallback(
    async (role, email, password) => {
      const requestedRole = normalizeRole(role || "student");

      try {
        // Strict credential verification: loginUser delegates to
        // supabase.auth.signInWithPassword and throws the native Supabase
        // error ("Invalid login credentials") when the password does not
        // match — never a silent local login.
        const { user } = await loginUser(email, password);
        if (!user?.id) throw new Error("Invalid login credentials");

        // The database profile is the single source of truth for the role.
        const profile = await fetchCurrentProfile(user.id);
        const effectiveRole = normalizeRole(profile?.role || "student");

        // Strict role gate: the account's database role must match the portal
        // tab the user selected. On mismatch the session is revoked
        // server-side and the login is rejected — a student picking the
        // Coordinator tab gets "Access Denied" instead of being silently
        // redirected (and vice versa).
        if (requestedRole !== effectiveRole) {
          try {
            await supabase.auth.signOut({ scope: "global" });
          } catch (signOutErr) {
            console.warn(
              "Session revocation after role mismatch failed:",
              signOutErr,
            );
          }
          const deniedMessage =
            requestedRole === "coordinator"
              ? "Access Denied: this account is registered as a student — you do not have coordinator access."
              : "Access Denied: this account is a coordinator — use the coordinator portal.";
          // Toast from the context (not the page) so the message survives the
          // redirect bounce the revoked session causes.
          pushToast(deniedMessage, "danger");
          throw new Error(deniedMessage);
        }

        const authState = buildAuthState(
          user,
          profile || { role: effectiveRole },
        );
        setAuth(authState);
        await syncLiveData();
        return authState;
      } catch (err) {
        // Demo fallback ONLY when no real Supabase backend is configured
        // (noop client — env vars missing at build time). With a real
        // backend, every failure — wrong password, unknown email, network
        // error — is rethrown so the login attempt is explicitly rejected.
        if (!isSupabaseConfigured) {
          if (requestedRole !== "student") {
            throw new Error(
              "Access Denied: local demo sessions are student-only. Coordinator access requires a database role.",
            );
          }
          const demoUser = {
            id: "s1",
            email,
            name: email.split("@")[0]
              ? email.split("@")[0].replace(".", " ")
              : "Aarav Mehta",
            role: "student",
            avatarColor: "#7C3AED",
            rollNo: "CS21B045",
            branch: "Computer Science",
            year: "3rd Year",
            joined: getLocalJoinedDate(email),
          };

          const authState = {
            role: demoUser.role,
            user: demoUser,
          };
          setAuth(authState);
          return authState;
        }
        throw err;
      }
    },
    [pushToast, syncLiveData],
  );

  const signup = useCallback(
    async (name, email, password, role = "student") => {
      try {
        const result = await signUpUser(email, password, name);
        const user = result?.user;

        if (user) {
          const profile = await fetchCurrentProfile(user.id);
          // Strictly student by default: the DB trigger creates the profile
          // with role 'student', and the role guard rejects anything else for
          // non-admin signups. Never honor a requested role here.
          const effectiveRole = profile?.role || "student";

          if (
            role === "coordinator" &&
            effectiveRole !== "coordinator" &&
            typeof pushToast === "function"
          ) {
            pushToast(
              "Coordinator accounts are not created via signup. You joined as a student.",
              "warning",
            );
          }

          const authState = buildAuthState(
            user,
            profile || { role: effectiveRole },
          );
          setAuth(authState);
          await syncLiveData();
          return authState;
        }
      } catch (err) {
        console.warn("Supabase signup failed, creating local session:", err);
      }

      // Local fallback session: always a student. Same rule as login — the
      // demo path must never mint a coordinator.
      const localUser = {
        id: `u_${Date.now()}`,
        email,
        name,
        role: "student",
        avatarColor: "#7C3AED",
        rollNo: "CS21B" + Math.floor(100 + Math.random() * 900),
        branch: "Computer Science",
        year: "1st Year",
        joined: getLocalJoinedDate(email),
      };

      setStudents((prev) => [localUser, ...prev]);

      const authState = { role: "student", user: localUser };
      setAuth(authState);
      return authState;
    },
    [pushToast, syncLiveData],
  );

  const logout = useCallback(async () => {
    // 1. Purge React auth state FIRST so the UI responds instantly and
    //    ProtectedRoute redirects away regardless of network conditions.
    //    Waiting on signOut() made logout hang whenever the auth request
    //    stalled on a flaky network, leaving the user stuck on the dashboard.
    setAuth(null);

    // 2. Revoke the session server-side. scope "global" calls
    //    POST /auth/v1/logout?scope=global, which invalidates the refresh
    //    token — backend JWTs are actually revoked, not just dropped from
    //    this browser's storage.
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (e) {
      // Best-effort: if the network is down the local purge below still
      // guarantees the user is signed out in this browser.
      console.warn("Sign out error (local purge continues):", e);
    }

    // 3. Wipe app-owned browser storage: Supabase auth tokens ("sb-...")
    //    and local demo keys ("nexura_..."). This is a targeted wipe, not
    //    localStorage.clear(), so unrelated site data is preserved.
    try {
      const doomed = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.startsWith("nexura_"))) {
          doomed.push(key);
        }
      }
      doomed.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (e) {
      console.warn("Storage wipe failed:", e);
    }

    // 4. Full-page redirect to the root. A hard navigation (not a router
    //    push) guarantees a fresh app bootstrap — no stale React state,
    //    subscriptions, or in-memory data can survive in this tab, and any
    //    pending framework work is discarded cleanly instead of crashing on
    //    the unmounted tree.
    try {
      window.location.replace("/");
    } catch (e) {
      console.warn("Redirect failed:", e);
    }
  }, []);

  const createTask = useCallback(
    async (taskData) => {
      const allStudentIds = students.map((s) => s.id);
      const assigned =
        Array.isArray(taskData.assignedTo) && taskData.assignedTo.length > 0
          ? taskData.assignedTo
          : allStudentIds;

      console.log("[context createTask] Starting. assigned:", assigned);

      try {
        const created = await createDbTask(taskData);
        console.log("[context createTask] createDbTask returned:", created);
        if (created) {
          const normalized = normalizeTask(created);
          const merged = { ...normalized, assignedTo: assigned };
          setTasks((prev) => [merged, ...prev]);
          pushToast("Task created successfully!");
          return merged;
        }
      } catch (err) {
        console.error("[context createTask] Database task creation failed:", err?.message || err);
      }

      pushToast(
        "Could not save task to the database. Check your connection and try again.",
        "danger",
      );
      return null;
    },
    [pushToast, students],
  );

  const updateTask = useCallback(
    async (taskId, updates) => {
      // Optimistic update in React state (camelCase).
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
      );
      try {
        // Convert camelCase keys to snake_case for the DB.
        const dbUpdates = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty;
        if (updates.points !== undefined) dbUpdates.points = updates.points;
        if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
        if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo;
        if (updates.requirements !== undefined) dbUpdates.requirements = updates.requirements;

        const { error } = await supabase
          .from("tasks")
          .update(dbUpdates)
          .eq("id", taskId);
        if (error) throw error;
      } catch (e) {
        console.warn("Supabase task update failed, reverting:", e);
        pushToast("Task update could not be saved.", "danger");
        await syncLiveData(); // Revert optimistic state to DB truth.
        return;
      }
      pushToast("Task updated successfully!");
    },
    [pushToast, syncLiveData],
  );

  const deleteTask = useCallback(
    async (taskId) => {
      try {
        // Delete the task first; if it succeeds, cascade-delete its
        // submissions. This avoids orphaned tasks when the task delete
        // fails after submissions are already gone.
        const { error: taskErr } = await supabase
          .from("tasks")
          .delete()
          .eq("id", taskId);
        if (taskErr) throw taskErr;

        await supabase.from("submissions").delete().eq("task_id", taskId);
      } catch (e) {
        console.warn("Supabase task delete failed:", e);
        pushToast("Could not delete task from the database.", "danger");
        await syncLiveData(); // Revert optimistic state.
        return;
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSubmissions((prev) => prev.filter((s) => s.taskId !== taskId));
      pushToast("Task removed", "danger");
    },
    [pushToast, syncLiveData],
  );

  const submitTask = useCallback(
    async (taskId, studentId, payload, attempt = 1) => {
      const subId = `sub_${Date.now()}`;
      const effStudentId = studentId || auth?.user?.id || "s1";

      const newSub = {
        id: subId,
        taskId,
        studentId: effStudentId,
        status: "pending",
        submittedAt: new Date().toISOString(),
        fileName: payload?.fileName || (payload?.file ? payload.file.name : ""),
        githubUrl: payload?.githubUrl || "",
        liveUrl: payload?.liveUrl || "",
        notes: payload?.notes || "",
        feedback: "",
        reviewedAt: null,
        attempt: attempt || 1,
      };

      try {
        let dbRes;
        if (payload?.file) {
          dbRes = await submitDbTask(payload.file, taskId, effStudentId, {
            githubUrl: payload?.githubUrl || "",
            liveUrl: payload?.liveUrl || "",
            notes: payload?.notes || "",
          });
        } else {
          const { data, error } = await supabase
            .from("submissions")
            .insert([
              {
                student_id: effStudentId,
                task_id: taskId,
                file_url:
                  payload?.githubUrl ||
                  payload?.liveUrl ||
                  payload?.fileName ||
                  "",
                github_url: payload?.githubUrl || "",
                live_url: payload?.liveUrl || "",
                notes: payload?.notes || "",
                status: "pending",
              },
            ])
            .select()
            .single();

          if (error) throw error;
          dbRes = data;
        }

        if (dbRes) {
          const normalized = normalizeSubmission(dbRes);
          const merged = { ...newSub, ...normalized };
          setSubmissions((prev) => [
            merged,
            ...prev.filter((s) => s.id !== merged.id),
          ]);
          pushToast(
            attempt > 1
              ? "Resubmitted successfully!"
              : "Task submitted successfully!",
          );
          return merged;
        }
      } catch (err) {
        console.warn("Database submission failed:", err);
      }

      // DB insert failed — do NOT create a local-only submission. It would
      // be invisible to the coordinator and disappear on reload.
      pushToast(
        "Could not save submission to the database. Check your connection and try again.",
        "danger",
      );
      return null;
    },
    [auth?.user?.id, pushToast],
  );

  const reviewSubmission = useCallback(
    async (submissionId, status, feedback) => {
      const reviewedAt = new Date().toISOString();

      // Optimistic update so the UI feels instant.
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? { ...s, status, feedback, reviewedAt }
            : s,
        ),
      );

      try {
        const { data, error } = await supabase
          .from("submissions")
          .update({ status, feedback, reviewed_at: reviewedAt })
          .eq("id", submissionId)
          .select()
          .single();

        if (error) throw error;

        // Replace with the authoritative DB row so a reload agrees with the UI.
        if (data) {
          const normalized = normalizeSubmission(data);
          setSubmissions((prev) =>
            prev.map((s) =>
              s.id === submissionId ? { ...s, ...normalized } : s,
            ),
          );
        }
      } catch (err) {
        console.warn("Database review update failed:", err);
        pushToast("Review could not be saved to the database.", "danger");
        await syncLiveData(); // Revert optimistic state to DB truth.
        return;
      }

      // The student-facing notification is created by the DB trigger on the
      // status change, so it survives reloads and reaches the student's
      // account even in a different session.
      pushToast(
        status === "approved"
          ? "Submission approved"
          : "Submission rejected with feedback",
        status === "approved" ? "success" : "danger",
      );
    },
    [pushToast, syncLiveData],
  );

  const removeSubmission = useCallback(
    async (submissionId) => {
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      try {
        await supabase.from("submissions").delete().eq("id", submissionId);
      } catch (e) {
        console.warn("Supabase remove submission error:", e);
      }
      pushToast("Submission removed", "danger");
    },
    [pushToast],
  );

  const updateProfile = useCallback(
    async (name, email) => {
      if (auth?.user) {
        const updatedUser = {
          ...auth.user,
          name: name || auth.user.name,
          email: email || auth.user.email,
        };
        setAuth((prev) => (prev ? { ...prev, user: updatedUser } : prev));
        try {
          // Persist both name and email to the profiles table so the change
          // survives page reloads. Previously only name was saved here;
          // email was applied to local state and silently lost on reload.
          await supabase
            .from("profiles")
            .update({ name, email })
            .eq("id", auth.user.id);
        } catch (e) {
          console.warn("Supabase profile update skipped:", e);
        }
        pushToast("Profile updated successfully!");
      }
    },
    [auth?.user, pushToast],
  );

  const getStudent = useCallback(
    (id) => {
      // When a real backend is configured, only return data from the DB
      // (context state). Never fall back to mock data — it would show
      // phantom students that don't exist in the database.
      if (isSupabaseConfigured) {
        return students.find((s) => s.id === id) || null;
      }
      // Demo mode: fall back to mock data.
      return (
        students.find((s) => s.id === id) ||
        getMockStudentById(id) || {
          id: id || "s1",
          name: "Student",
          rollNo: "CS21B000",
          branch: "Computer Science",
          year: "3rd Year",
          avatarColor: "#7C3AED",
        }
      );
    },
    [students],
  );

  const getTask = useCallback(
    (id) => {
      // Same as getStudent: no mock fallback when the real backend is live.
      if (isSupabaseConfigured) {
        return tasks.find((t) => t.id === id) || null;
      }
      return (
        tasks.find((t) => t.id === id) ||
        getMockTaskById(id) ||
        TASKS.find((t) => t.id === id)
      );
    },
    [tasks],
  );

  const persistNotifRead = useCallback(
    async (id) => {
      const userId = auth?.user?.id;
      if (!userId || !isDbUuid(userId) || !isDbUuid(id)) return true; // local-only, no DB needed
      try {
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", id)
          .eq("user_id", userId);
        return !error;
      } catch (err) {
        console.warn("Failed to mark notification read:", err);
        return false;
      }
    },
    [auth?.user?.id],
  );

  const markNotifRead = useCallback(
    (role, id) => {
      // Optimistic update: mark as read in UI immediately.
      const setter = role === "student" ? setStudentNotifs : setAdminNotifs;
      setter((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );

      // Persist to DB; revert if it fails so UI stays in sync with DB.
      persistNotifRead(id).then((ok) => {
        if (!ok) {
          setter((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: false } : n)),
          );
        }
      });
    },
    [persistNotifRead],
  );

  const markAllNotifRead = useCallback(
    async (role) => {
      // Snapshot the current state so we can revert on DB failure.
      const setter = role === "student" ? setStudentNotifs : setAdminNotifs;
      let previousNotifs = [];
      setter((prev) => {
        previousNotifs = prev;
        return prev.map((n) => ({ ...n, read: true }));
      });

      const userId = auth?.user?.id;
      if (userId && isDbUuid(userId)) {
        try {
          const { error } = await supabase
            .from("notifications")
            .update({ read: true })
            .eq("user_id", userId)
            .eq("read", false);
          if (error) throw error;
        } catch (err) {
          console.warn("Failed to mark all notifications read:", err);
          // Revert to the snapshot so UI stays in sync with DB.
          setter(previousNotifs);
        }
      }
    },
    [auth?.user?.id],
  );

  const value = useMemo(
    () => ({
      auth,
      login,
      signup,
      logout,
      students,
      tasks,
      submissions,
      studentNotifs,
      adminNotifs,
      toasts,
      pushToast,
      dismissToast,
      createTask,
      updateTask,
      deleteTask,
      submitTask,
      reviewSubmission,
      removeSubmission,
      updateProfile,
      getStudent,
      getTask,
      markNotifRead,
      markAllNotifRead,
    }),
    [
      auth,
      login,
      signup,
      logout,
      students,
      tasks,
      submissions,
      studentNotifs,
      adminNotifs,
      toasts,
      pushToast,
      dismissToast,
      createTask,
      updateTask,
      deleteTask,
      submitTask,
      reviewSubmission,
      removeSubmission,
      updateProfile,
      getStudent,
      getTask,
      markNotifRead,
      markAllNotifRead,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
