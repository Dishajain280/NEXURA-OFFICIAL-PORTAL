import React, { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { useApp } from "../../context/AppContext";
import EmptyState from "../../components/EmptyState";

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


const getSubmissionStatusForTask = (submissions, taskId, studentId) => {
  if (!Array.isArray(submissions)) return "pending";

  const match = submissions.find(
    (submission) =>
      submission.taskId === taskId &&
      submission.studentId === studentId,
  );

  return match?.status || "pending";
};

export default function Students() {
  const { students: contextStudents, tasks, submissions } = useApp();
  const [query, setQuery] = useState("");

  const students = contextStudents.filter(
    (s) => !s.role || s.role === "student"
  );

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
      const assigned = Array.isArray(task.assignedTo) ? task.assignedTo : [];
      return (
        assigned.length === 0 ||
        assigned.includes(studentId)
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
