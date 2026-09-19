import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  ListChecks,
  Clock,
  CheckCircle2,
  XCircle,
  PlusSquare,
  ArrowRight,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import StatCard from "../../components/StatCard";
import SubmissionTable from "../../components/SubmissionTable";
import EmptyState from "../../components/EmptyState";
import { Inbox } from "lucide-react";

export default function Dashboard() {
  const { auth, students, tasks, submissions } = useApp();

  const counts = useMemo(() => {
    const c = {
      totalStudents: students.length,
      totalTasks: tasks.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    submissions.forEach((s) => {
      if (s.status === "pending") c.pending++;
      else if (s.status === "approved") c.approved++;
      else if (s.status === "rejected") c.rejected++;
    });
    return c;
  }, [students, tasks, submissions]);

  const recentSubs = useMemo(
    () =>
      [...submissions]
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 6),
    [submissions],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-nexura-gradient p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <p className="text-nexura-200 text-sm font-medium">Welcome back,</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1">
              {auth?.user?.name || "Coordinator"} 👋
            </h2>
            <p className="text-nexura-200 text-sm mt-2">
              {counts.pending} submission{counts.pending === 1 ? "" : "s"}{" "}
              waiting for your review.
            </p>
          </div>
          <Link
            to="/coordinator/tasks/create"
            className="btn-primary text-sm shrink-0"
          >
            <PlusSquare className="w-4 h-4" /> Create Task
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Students"
          value={counts.totalStudents}
          icon={Users}
          tone="purple"
        />
        <StatCard
          label="Total Tasks"
          value={counts.totalTasks}
          icon={ListChecks}
          tone="purple"
        />
        <StatCard
          label="Pending Reviews"
          value={counts.pending}
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Approved"
          value={counts.approved}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Rejected"
          value={counts.rejected}
          icon={XCircle}
          tone="danger"
        />
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-white">
            Recent Submissions
          </h3>
          <Link
            to="/coordinator/submissions"
            className="text-sm font-medium text-nexura-300 hover:text-nexura-200 inline-flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentSubs.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No submissions yet"
            message="Submissions will appear here once students start submitting work."
          />
        ) : (
          <SubmissionTable submissions={recentSubs} />
        )}
      </div>
    </div>
  );
}
