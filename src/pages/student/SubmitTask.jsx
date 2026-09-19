import React, { useState } from "react";
import { useParams, useNavigate, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Github, Globe, FileText, Send, MessageSquareText } from "lucide-react";
import { useApp } from "../../context/AppContext";
import FileUpload from "../../components/FileUpload";
import { getLatestSubmission, getSubmissionStatusForTask } from "../../data/mockData";

export default function SubmitTask() {
  const { id } = useParams();
  const { auth, tasks, submissions, submitTask } = useApp();
  const navigate = useNavigate();
  const task = tasks.find((t) => t.id === id);

  const studentId = auth?.user?.id || "s1";
  const status = task ? getSubmissionStatusForTask(submissions, task.id, studentId) : null;
  const latestSub = task ? getLatestSubmission(submissions, task.id, studentId) : null;

  const [file, setFile] = useState(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!task) return <Navigate to="/student/tasks" replace />;

  const isResubmit = status === "rejected";

  const validate = () => {
    const errs = {};
    if (!file && !githubUrl.trim()) errs.form = "Add at least a file upload or a GitHub repository URL.";
    if (githubUrl.trim() && !/^https?:\/\/(www\.)?github\.com\//i.test(githubUrl.trim())) {
      errs.githubUrl = "Enter a valid GitHub URL (https://github.com/...)";
    }
    if (liveUrl.trim() && !/^https?:\/\//i.test(liveUrl.trim())) {
      errs.liveUrl = "Enter a valid URL starting with http(s)://";
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const newAttempt = isResubmit ? (latestSub?.attempt || 1) + 1 : 1;
      const sub = await submitTask(
        task.id,
        studentId,
        { file, fileName: file?.name || "", githubUrl: githubUrl.trim(), liveUrl: liveUrl.trim(), notes: notes.trim() },
        newAttempt
      );
      if (sub) {
        navigate(`/student/submissions/${sub.id}`);
      } else {
        setErrors({ form: "Submission could not be saved. Please try again." });
      }
    } catch (err) {
      setErrors({ form: err.message || "Failed to submit task" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to={`/student/tasks/${task.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-nexura-300 hover:text-nexura-200">
        <ArrowLeft className="w-4 h-4" /> Back to Task
      </Link>

      <div className="card p-6 sm:p-7">
        <h1 className="font-display text-xl font-bold text-white">
          {isResubmit ? "Resubmit" : "Submit"}: {task.title}
        </h1>
        <p className="text-sm text-slate mt-1.5">
          {isResubmit ? "Address the feedback below and resubmit your work." : "Attach your work below. You can include a file, a GitHub repo, and/or a live deployment link."}
        </p>

        {isResubmit && latestSub?.feedback && (
          <div className="mt-5 rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex gap-3">
            <MessageSquareText className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400">Previous feedback</p>
              <p className="text-sm text-red-400/90 mt-1">{latestSub.feedback}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="label-text">Upload file</label>
            <FileUpload file={file} onFileSelect={setFile} />
          </div>

          <div>
            <label className="label-text flex items-center gap-2"><Github className="w-4 h-4 text-nexura-400" /> GitHub repository URL</label>
            <input
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username/repo"
              className="input-field"
            />
            {errors.githubUrl && <p className="text-xs text-red-400 mt-1">{errors.githubUrl}</p>}
          </div>

          <div>
            <label className="label-text flex items-center gap-2"><Globe className="w-4 h-4 text-nexura-400" /> Live deployment URL (optional)</label>
            <input
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="https://your-project.vercel.app"
              className="input-field"
            />
            {errors.liveUrl && <p className="text-xs text-red-400 mt-1">{errors.liveUrl}</p>}
          </div>

          <div>
            <label className="label-text flex items-center gap-2"><FileText className="w-4 h-4 text-nexura-400" /> Notes for the reviewer (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Anything the coordinator should know about your submission..."
              className="input-field resize-none"
            />
          </div>

          {errors.form && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3.5 py-2.5">{errors.form}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
            {submitting ? "Submitting..." : (
              <>
                {isResubmit ? "Resubmit Task" : "Submit Task"} <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
