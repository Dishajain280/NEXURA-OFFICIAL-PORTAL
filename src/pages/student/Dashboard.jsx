import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ListChecks, Clock, CheckCircle2, XCircle, CalendarClock, ArrowRight, Activity } from "lucide-react";
import { useApp } from "../../context/AppContext";
import StatCard from "../../components/StatCard";
import ProgressBar from "../../components/ProgressBar";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/EmptyState";
import { SkeletonCard, SkeletonStatCard } from "../../components/Skeleton";
import { formatDate, daysUntil, getSubmissionStatusForTask, timeAgo } from "../../data/mockData";

export default function Dashboard() {
  const { auth, tasks, submissions, studentNotifs } = useApp();
  const studentId = auth?.user?.id || "s1";

  const myTasks = useMemo(
    () => tasks.filter((t) => !t.assignedTo || t.assignedTo.length === 0 || t.assignedTo.includes(studentId)),
    [tasks, studentId]
  );

  const statuses = useMemo(
    () => myTasks.map((t) => ({ task: t, status: getSubmissionStatusForTask(submissions, t.id, studentId) })),
    [myTasks, submissions, studentId]
  );

  const counts = useMemo(() => {
    const c = { total: myTasks.length, pending: 0, approved: 0, rejected: 0, notSubmitted: 0 };
    statuses.forEach(({ status }) => {
      if (status === "pending") c.pending++;
      else if (status === "approved") c.approved++;
      else if (status === "rejected") c.rejected++;
      else c.notSubmitted++;
    });
    return c;
  }, [statuses]);

  const upcoming = useMemo(
    () =>
      statuses
        .filter(({ status }) => status !== "approved")
        .map(({ task, status }) => ({ task, status, days: daysUntil(task.deadline) }))
        .filter((x) => x.days >= -30)
        .sort((a, b) => a.days - b.days)
        .slice(0, 4),
    [statuses]
  );

  const recentActivity = useMemo(
    () =>
      submissions
        .filter((s) => s.studentId === studentId)
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 5),
    [submissions, studentId]
  );

  const progressPct = counts.total > 0 ? (counts.approved / counts.total) * 100 : 0;

  // Show loading skeleton while auth or data is loading
  if (!auth) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-nexura-gradient p-6 sm:p-8">
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-xl2 bg-nexura-gradient bg-nexura-radial p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-nexura-200 text-sm font-medium">Welcome back,</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1">{auth?.user?.name ? auth.user.name.split(" ")[0] : "Student"} 👋</h2>
          <p className="text-nexura-200 text-sm mt-2 max-w-md">
            You have {counts.pending} submission{counts.pending === 1 ? "" : "s"} under review and {counts.notSubmitted} task{counts.notSubmitted === 1 ? "" : "s"} awaiting your work.
          </p>
          <Link to="/student/tasks" className="btn-primary mt-5 text-sm">
            View my tasks <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={counts.total} icon={ListChecks} tone="purple" />
        <StatCard label="Pending" value={counts.pending} icon={Clock} tone="warning" />
        <StatCard label="Approved" value={counts.approved} icon={CheckCircle2} tone="success" />
        <StatCard label="Rejected" value={counts.rejected} icon={XCircle} tone="danger" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Progress + Upcoming */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-white">Overall Progress</h3>
              <span className="text-sm text-slate">{counts.approved} of {counts.total} tasks approved</span>
            </div>
            <ProgressBar value={counts.approved} max={counts.total || 1} />
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-white flex items-center gap-2">
                <CalendarClock className="w-4.5 h-4.5 text-nexura-400" /> Upcoming Deadlines
              </h3>
              <Link to="/student/tasks" className="text-sm font-medium text-nexura-300 hover:text-nexura-200">View all</Link>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="You're all caught up" message="No upcoming deadlines right now." />
            ) : (
              <div className="space-y-3">
                {upcoming.map(({ task, status, days }) => (
                  <Link
                    key={task.id}
                    to={`/student/tasks/${task.id}`}
                    className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-white/10 hover:border-white/15 hover:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white text-sm truncate">{task.title}</p>
                      <p className="text-xs text-slate mt-0.5">
                        {days < 0 ? `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}` : days === 0 ? "Due today" : `Due in ${days} day${days === 1 ? "" : "s"}`} · {formatDate(task.deadline)}
                      </p>
                    </div>
                    <StatusBadge status={days < 0 && status === "not_submitted" ? "overdue" : status} size="sm" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card p-6">
          <h3 className="font-display font-semibold text-white flex items-center gap-2 mb-4">
            <Activity className="w-4.5 h-4.5 text-nexura-400" /> Recent Activity
          </h3>
          {recentActivity.length === 0 ? (
            <EmptyState icon={Activity} title="No activity yet" message="Your submissions will show up here." />
          ) : (
            <div className="space-y-4">
              {recentActivity.map((sub) => {
                const task = tasks.find((t) => t.id === sub.taskId);
                return (
                  <Link key={sub.id} to={`/student/submissions/${sub.id}`} className="flex gap-3 group">
                    <div className="w-2 h-2 rounded-full bg-nexura-400 mt-1.5 shrink-0" />
                    <div className="min-w-0 pb-4 border-b border-white/5 last:border-0 last:pb-0 flex-1">
                      <p className="text-sm text-nexura-100 group-hover:text-nexura-300 transition-colors">
                        Submitted <span className="font-medium">{task?.title}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <StatusBadge status={sub.status} size="sm" />
                        <span className="text-xs text-slate/70">{timeAgo(sub.submittedAt)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
