import React from "react";
import { useNavigate } from "react-router-dom";
import { Github, Globe, Paperclip, Eye, Trash2 } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { formatDateTime } from "../data/mockData";
import { useApp } from "../context/AppContext";
import { sanitizeUrl } from "../lib/sanitizeUrl";

export default function SubmissionTable({ submissions, onRemove, emptyMessage = "No submissions found." }) {
  const navigate = useNavigate();
  const { getStudent, getTask } = useApp();

  if (submissions.length === 0) {
    return (
      <div className="py-16 text-center text-slate text-sm">{emptyMessage}</div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm min-w-[760px]">
        <thead>
          <tr className="text-left text-xs text-slate font-semibold uppercase tracking-wide border-b border-white/10">
            <th className="px-2 pb-3 font-semibold">Student</th>
            <th className="px-2 pb-3 font-semibold">Task</th>
            <th className="px-2 pb-3 font-semibold">Submitted</th>
            <th className="px-2 pb-3 font-semibold">Links</th>
            <th className="px-2 pb-3 font-semibold">Status</th>
            <th className="px-2 pb-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub) => {
            const student = getStudent(sub.studentId);
            const task = getTask(sub.taskId);
            return (
              <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-2 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                      style={{ backgroundColor: student?.avatarColor || "#7C3AED" }}
                    >
                      {student?.name?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{student?.name || "Unknown"}</p>
                      <p className="text-xs text-slate truncate">{student?.rollNo}</p>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3.5 max-w-[220px]">
                  <p className="text-nexura-100 truncate">{task?.title || "Unknown task"}</p>
                  {sub.attempt > 1 && <p className="text-xs text-nexura-400">Attempt {sub.attempt}</p>}
                </td>
                <td className="px-2 py-3.5 text-slate whitespace-nowrap">{formatDateTime(sub.submittedAt)}</td>
                <td className="px-2 py-3.5">
                  <div className="flex items-center gap-2.5 text-slate">
                    {sub.githubUrl && <Github className="w-4 h-4" />}
                    {sub.liveUrl && <Globe className="w-4 h-4" />}
                    {sub.fileName && <Paperclip className="w-4 h-4" />}
                  </div>
                </td>
                <td className="px-2 py-3.5">
                  <StatusBadge status={sub.status} size="sm" />
                </td>
                <td className="px-2 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => navigate(`/coordinator/submissions/${sub.id}`)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-nexura-300 hover:bg-nexura-500/15 transition-colors"
                      aria-label="Review submission"
                      title="Review"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {onRemove && (
                      <button
                        onClick={() => onRemove(sub)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        aria-label="Remove submission"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
