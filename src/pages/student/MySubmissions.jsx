import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, FolderCheck, Github, Globe, Paperclip, ChevronRight } from "lucide-react";
import { useApp } from "../../context/AppContext";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/EmptyState";
import { SkeletonTable } from "../../components/Skeleton";
import { formatDateTime, getTaskById } from "../../data/mockData";

const FILTERS = ["all", "pending", "approved", "rejected"];

export default function MySubmissions() {
  const { auth, submissions, getTask } = useApp();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const studentId = auth?.user?.id || "s1";

  const mySubs = useMemo(() => {
    return submissions
      .filter((s) => s.studentId === studentId)
      .filter((s) => filter === "all" || s.status === filter)
      .filter((s) => (getTask(s.taskId)?.title || "").toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }, [submissions, studentId, filter, query, getTask]);

  if (!auth) {
    return (
      <div className="space-y-6">
        <div className="card p-6">
          <SkeletonTable rows={4} />
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
            placeholder="Search submissions..."
            className="bg-transparent outline-none text-sm w-full placeholder:text-slate/60"
          />
        </div>
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-sm font-medium px-3.5 py-2 rounded-lg capitalize transition-colors ${
                filter === f ? "bg-nexura-500 text-white" : "bg-white/5 text-slate border border-white/10 hover:bg-white/10"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {mySubs.length === 0 ? (
        <div className="card">
          <EmptyState icon={FolderCheck} title="No submissions yet" message="Once you submit a task, it will show up here." />
        </div>
      ) : (
        <div className="card divide-y divide-white/5">
          {mySubs.map((sub) => {
            const task = getTask(sub.taskId);
            return (
              <Link key={sub.id} to={`/student/submissions/${sub.id}`} className="flex items-center justify-between gap-4 p-4 sm:p-5 hover:bg-white/5 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white truncate">{task?.title || "Unknown task"}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate">
                    <span>Submitted {formatDateTime(sub.submittedAt)}</span>
                    {sub.attempt > 1 && <span className="text-nexura-400 font-medium">Attempt {sub.attempt}</span>}
                    <span className="flex items-center gap-2.5">
                      {sub.fileName && <Paperclip className="w-3.5 h-3.5" />}
                      {sub.githubUrl && <Github className="w-3.5 h-3.5" />}
                      {sub.liveUrl && <Globe className="w-3.5 h-3.5" />}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={sub.status} size="sm" />
                  <ChevronRight className="w-4 h-4 text-slate" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
