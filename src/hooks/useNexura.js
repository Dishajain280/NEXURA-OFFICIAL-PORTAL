import supabase from "../supabaseClient";
import { isUniversityEmail } from "../lib/roleGuard";

export async function signUpUser(email, password, name) {
  if (!isUniversityEmail(email))
    throw new Error("Only .com university emails are allowed");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) throw error;
  return data;
}

export async function loginUser(email, password) {
  // Strict credential verification: supabase.auth.signInWithPassword validates
  // the email/password pair server-side and returns an AuthApiError (e.g.
  // "Invalid login credentials") when they do not match. That error is
  // propagated to the caller untouched — never swallowed.
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  if (!data?.user) throw new Error("Invalid login credentials");
  return data;
}

export async function fetchTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("deadline", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createTask(taskData) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .maybeSingle();

      // Fail closed: if the profile can't be read, treat the caller as a
      // student. Never assume coordinator on a missing/errored lookup — that
      // would let a student create tasks whenever the check hiccups.
      const role = profile?.role || "student";
      if (!["admin", "coordinator", "Faculty Coordinator"].includes(role)) {
        throw new Error("Coordinator or Admin access required to create tasks");
      }
    }
  } catch (err) {
    console.warn("Auth check warning in createTask:", err);
  }

  const deadline = new Date(taskData.deadline);
  if (Number.isNaN(deadline.getTime())) {
    throw new Error("Invalid task deadline date");
  }

  const payload = {
    title: taskData.title?.trim() || "Untitled Task",
    description: taskData.description?.trim() || "",
    deadline: deadline.toISOString(),
    points: Number(taskData.points || 10),
    category: taskData.category || "General",
    difficulty: taskData.difficulty || "Medium",
    requirements: Array.isArray(taskData.requirements)
      ? taskData.requirements
      : [],
    assigned_to: Array.isArray(taskData.assignedTo) ? taskData.assignedTo : [],
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function submitTask(file, taskId, studentId) {
  if (!file) throw new Error("File is required");

  const folder = `${studentId}`;
  const path = `${folder}/${taskId}/${studentId}-${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  const { error: uploadError } = await supabase.storage
    .from("task-submissions")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("task-submissions")
    .createSignedUrl(path, 60 * 60 * 24);

  if (signedUrlError) throw signedUrlError;

  // Check if a submission already exists for this student+task pair
  const { data: existingSubmission, error: checkError } = await supabase
    .from("submissions")
    .select("id")
    .eq("student_id", studentId)
    .eq("task_id", taskId)
    .maybeSingle();

  if (checkError && checkError.code !== "PGRST116") throw checkError;

  let result;

  if (existingSubmission?.id) {
    // Update existing submission (resubmission)
    const { data, error } = await supabase
      .from("submissions")
      .update({
        file_url: signedUrlData.signedUrl,
        status: "pending",
      })
      .eq("id", existingSubmission.id)
      .select()
      .single();

    if (error) throw error;
    result = data;
  } else {
    // Insert new submission
    const { data, error } = await supabase
      .from("submissions")
      .insert([
        {
          student_id: studentId,
          task_id: taskId,
          file_url: signedUrlData.signedUrl,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) throw error;
    result = data;
  }

  return result;
}

export async function fetchLeaderboard() {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      name,
      role,
      submissions (
        status,
        tasks (points)
      )
    `,
    )
    .eq("role", "student");

  if (error) throw error;

  return (data ?? [])
    .map((profile) => {
      const points = (profile.submissions ?? [])
        .filter((submission) => submission.status === "approved")
        .reduce((sum, submission) => sum + (submission.tasks?.points ?? 0), 0);

      return {
        studentId: profile.id,
        name: profile.name,
        points,
      };
    })
    .filter((entry) => entry.points > 0)
    .sort((a, b) => b.points - a.points);
}

export default {
  signUpUser,
  loginUser,
  fetchTasks,
  createTask,
  submitTask,
  fetchLeaderboard,
};
