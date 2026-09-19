import React, { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import EmptyState from "../../components/EmptyState";
import supabase from "../../supabaseClient";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const normalizeStudent = (row) => ({
  id: row.id,
  name: row.name || "Student",
  email: row.email || "",
  rollNo: row.roll_no || row.rollNo || "N/A",
  branch: row.branch || "Computer Science",
  year: row.year || "3rd Year",
  avatarColor: row.avatar_color || row.avatarColor || "#7C3AED",
  joined: row.joined_at || row.created_at || "2024-08-12",
});

const getSubmissionStatusForTask = (submissions, taskId, studentId) => {
  if (!Array.isArray(submissions)) return "pending";

  const match = submissions.find(
    (submission) =>
      (submission.task_id || submission.taskId) === taskId &&
      (submission.student_id || submission.studentId) === studentId,
  );

  return match?.status || "pending";
};

export default function Students() {
  const [students, setStudents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const [studentResult, taskResult, submissionResult] = await Promise.all(
          [
            supabase
              .from("profiles")
              .select("*")
              .eq("role", "student")
              .order("created_at", {
                ascending: false,
              }),
            supabase.from("tasks").select("*").order("created_at", {
              ascending: false,
            }),
            supabase.from("submissions").select("*").order("created_at", {
              ascending: false,
            }),
          ],
        );

        if (!active) return;

        if (studentResult.error) throw studentResult.error;
        if (taskResult.error) throw taskResult.error;
        if (submissionResult.error) throw submissionResult.error;

        setStudents((studentResult.data || []).map(normalizeStudent));
        setTasks(taskResult.data || []);
        setSubmissions(submissionResult.data || []);
      } catch (error) {
        console.error("Failed to fetch student dashboard data:", error);
        setStudents([]);
        setTasks([]);
        setSubmissions([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      students.filter(
        (student) =>
          (student.name || "").toLowerCase().includes(query.toLowerCase()) ||
          (student.rollNo || "").toLowerCase().includes(query.toLowerCase()),
      ),
    [students, query],
  );

  const statsFor = (studentId) => {
    const assignedTasks = tasks.filter((task) => {
      const assignedTo = Array.isArray(task.assigned_to)
        ? task.assigned_to
        : Array.isArray(task.assignedTo)
          ? task.assignedTo
          : [];

      return (
        assignedTo.length === 0 ||
        assignedTo.includes(studentId) ||
        !task.assigned_to
      );
    });

    const approved = assignedTasks.filter(
      (task) =>
        getSubmissionStatusForTask(submissions, task.id, studentId) ===
        "approved",
    ).length;

    const pending = assignedTasks.filter(
      (task) =>
        getSubmissionStatusForTask(submissions, task.id, studentId) ===
        "pending",
    ).length;

    return {
      total: assignedTasks.length,
      approved,
      pending,
    };
  };

  if (loading) {
    return <div className="card p-6 text-sm text-slate">Loading students…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 w-full sm:w-80 shadow-sm">
        <Search className="w-4 h-4 text-slate shrink-0" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or roll number..."
          className="bg-transparent outline-none text-sm w-full placeholder:text-slate/60"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="No students found"
            message="Try a different search term."
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((student) => {
            const stats = statsFor(student.id);
            return (
              <div key={student.id} className="card p-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-display font-semibold shrink-0"
                    style={{
                      backgroundColor: student.avatarColor || "#7C3AED",
                    }}
                  >
                    {(student.name || "S").charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">
                      {student.name}
                    </p>
                    <p className="text-xs text-slate truncate">
                      {student.rollNo}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-sm text-slate">
                  <div className="flex justify-between">
                    <span>Branch</span>
                    <span className="text-white font-medium">
                      {student.branch}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Year</span>
                    <span className="text-white font-medium">
                      {student.year}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Joined</span>
                    <span className="text-white font-medium">
                      {formatDate(student.joined)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                  <div className="flex-1 text-center">
                    <p className="font-display font-bold text-white">
                      {stats.total}
                    </p>
                    <p className="text-xs text-slate">Assigned</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="font-display font-bold text-emerald-400">
                      {stats.approved}
                    </p>
                    <p className="text-xs text-slate">Approved</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="font-display font-bold text-amber-400">
                      {stats.pending}
                    </p>
                    <p className="text-xs text-slate">Pending</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
