import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Inbox, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import SubmissionTable from "../../components/SubmissionTable";
import EmptyState from "../../components/EmptyState";
import ConfirmDialog from "../../components/ConfirmDialog";

const STATUS_FILTERS = ["all", "pending", "approved", "rejected"];

export default function Submissions() {
  const { submissions, tasks, students, removeSubmission } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const taskFilter = searchParams.get("task") || "all";
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [toRemove, setToRemove] = useState(null);

  const getStudent = (studentId) =>
    students.find((s) => s.id === studentId) || {
      id: studentId,
      name: "Unknown Student",
      rollNo: "N/A",
    };

  const getTask = (taskId) =>
    tasks.find((t) => t.id === taskId) || {
      id: taskId,
      title: "Unknown Task",
    };

  const filtered = useMemo(() => {
    return submissions
      .filter((s) => taskFilter === "all" || s.taskId === taskFilter)
      .filter((s) => status === "all" || s.status === status)
      .filter((s) => {
        if (!query.trim()) return true;
        const student = getStudent(s.studentId);
        const task = getTask(s.taskId);
        const q = query.toLowerCase();
        return (
          (student?.name || "").toLowerCase().includes(q) ||
          (task?.title || "").toLowerCase().includes(q) ||
          (student?.rollNo || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }, [submissions, taskFilter, status, query]);

  const filterTask = taskFilter !== "all" ? getTask(taskFilter) : null;

  const handleRemoveSubmission = async (submissionId) => {
    removeSubmission(submissionId);
    setToRemove(null);
  };

  return (
    <div className="space-y-6">
      {filterTask && (
        <div className="flex items-center gap-2 bg-nexura-500/10 border border-nexura-500/25 rounded-lg px-3.5 py-2 text-sm w-fit">
          <span className="text-nexura-200">
            Filtering by task: <strong>{filterTask.title}</strong>
          </span>
          <button
            onClick={() => setSearchParams({})}
            className="text-nexura-400 hover:text-nexura-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 w-full sm:w-80 shadow-sm">
          <Search className="w-4 h-4 text-slate shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by student, roll no, or task..."
            className="bg-transparent outline-none text-sm w-full placeholder:text-slate/60"
          />
        </div>
        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={`text-sm font-medium px-3.5 py-2 rounded-lg capitalize transition-colors ${
                status === f
                  ? "bg-nexura-500 text-white"
                  : "bg-white/5 text-slate border border-white/10 hover:bg-white/10"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-6">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No submissions found"
            message="Try adjusting your search or filters."
          />
        ) : (
          <SubmissionTable submissions={filtered} onRemove={setToRemove} />
        )}
      </div>

      <ConfirmDialog
        isOpen={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={() => handleRemoveSubmission(toRemove.id)}
        title="Remove this submission?"
        message="This will permanently delete the submission record. The student will need to resubmit if this was in error."
        confirmLabel="Remove Submission"
        danger
      />
    </div>
  );
}
