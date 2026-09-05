import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, ClipboardList, Clock, Info, Send, Trash2 } from "lucide-react";
import { timeAgo } from "../data/mockData";

const CONFIG = {
  approved: { Icon: CheckCircle2, classes: "bg-success/10 text-emerald-400" },
  rejected: { Icon: XCircle, classes: "bg-danger/10 text-red-400" },
  submitted: { Icon: Send, classes: "bg-nexura-500/15 text-nexura-300" },
  resubmitted: { Icon: Send, classes: "bg-nexura-500/15 text-nexura-300" },
  removed: { Icon: Trash2, classes: "bg-danger/10 text-red-400" },
  task: { Icon: ClipboardList, classes: "bg-nexura-500/15 text-nexura-300" },
  pending: { Icon: Clock, classes: "bg-warning/10 text-amber-400" },
  reminder: { Icon: Clock, classes: "bg-warning/10 text-amber-400" },
  info: { Icon: Info, classes: "bg-white/10 text-nexura-200" },
};

export default function NotificationCard({ notification, onRead }) {
  const navigate = useNavigate();
  const cfg = CONFIG[notification.type] || CONFIG.info;
  const { Icon, classes } = cfg;

  const handleClick = () => {
    onRead?.(notification.id);
    if (notification.link) navigate(notification.link);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-start gap-3.5 text-left px-4 py-3.5 rounded-xl transition-colors border ${
        notification.read
          ? "bg-white/[0.02] border-white/5 hover:bg-white/5"
          : "bg-nexura-500/10 border-nexura-400/25 hover:bg-nexura-500/15"
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${classes}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white truncate">{notification.title}</p>
          {!notification.read && <span className="w-1.5 h-1.5 rounded-full bg-nexura-500 shrink-0" />}
        </div>
        <p className="text-sm text-slate mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-slate/70 mt-1">{timeAgo(notification.time)}</p>
      </div>
    </button>
  );
}
