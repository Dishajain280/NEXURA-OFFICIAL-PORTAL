import React, { useMemo, useState } from "react";
import { Search, ListChecks } from "lucide-react";
import { useApp } from "../../context/AppContext";
import TaskCard from "../../components/TaskCard";
import EmptyState from "../../components/EmptyState";
import { SkeletonCard } from "../../components/Skeleton";
import { getSubmissionStatusForTask, isOverdue } from "../../data/mockData";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "not_submitted", label: "Not Submitted" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "overdue", label: "Overdue" },
];

export default function MyTasks() {
  const { auth, tasks, submissions } = useApp();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const studentId = auth?.user?.id || "s1";

  const myTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.assignedTo || t.assignedTo.length === 0 || t.assignedTo.includes(studentId))
      .map((t) => ({ task: t, status: getSubmissionStatusForTask(submissions, t.id, studentId) }))
      .filter(({ task, status }) => task.title.toLowerCase().includes(query.toLowerCase()))
      .filter(({ task, status }) => {
        if (filter === "all") return true;
        if (filter === "overdue") return isOverdue(task.deadline, status) && status !== "approved";
        return status === filter;
      })
      .sort((a, b) => new Date(a.task.deadline) - new Date(b.task.deadline));
  }, [tasks, submissions, studentId, filter, query]);

  if (!auth) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-24 h-9 rounded-lg animate-pulse bg-white/5" />
          ))}
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 w-full sm:w-72 shadow-sm">
          <Search className="w-4 h-4 text-slate shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            className="bg-transparent outline-none text-sm w-full placeholder:text-slate/60"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 text-sm font-medium px-3.5 py-2 rounded-lg transition-colors ${
                filter === f.key ? "bg-nexura-500 text-white" : "bg-white/5 text-slate border border-white/10 hover:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {myTasks.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ListChecks}
            title="No tasks found"
            message="Try adjusting your filters or search query."
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {myTasks.map(({ task, status }) => (
            <TaskCard key={task.id} task={task} status={status} to={`/student/tasks/${task.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
