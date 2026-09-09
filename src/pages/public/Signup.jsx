import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Zap,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { useApp } from "../../context/AppContext";

export default function Signup() {
  const { signup, pushToast } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Full name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      errs.email = "Enter a valid email";
    if (!form.password.trim()) errs.password = "Password is required";
    else if (form.password.length < 6)
      errs.password = "Use at least 6 characters";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      // Signup is strictly student-only — the DB trigger creates every new
      // profile with role 'student', and coordinator accounts are provisioned
      // by admins, never through public registration. Onboarding therefore
      // always lands on the student portal.
      const data = await signup(form.name, form.email, form.password, "student");
      pushToast(`Account created — welcome to Nexura, member!`);
      if (data?.user) {
        navigate("/student/dashboard");
      }
    } catch (error) {
      setErrors({ form: error.message || "Signup failed" });
      pushToast(error.message || "Signup failed", "danger");
    }
  };

  return (
    <div className="min-h-screen bg-nexura-950 bg-nexura-radial flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-cta-gradient flex items-center justify-center shadow-glow-purple">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="font-display font-extrabold text-lg tracking-wide text-white">
            NEXURA
          </span>
        </Link>

        <div className="glass-panel rounded-2xl p-5 sm:p-8">
          <h1 className="font-display text-2xl font-bold text-white text-center">
            Join Nexura
          </h1>
          <p className="text-sm text-nexura-300 text-center mt-1.5">
            Create your member account to start receiving tasks
          </p>

          <div className="flex items-center justify-center gap-2 mt-6 p-1 rounded-xl bg-white/5 border border-white/10">
            <span className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-nexura-200">
              <GraduationCap className="w-4 h-4" /> Student
            </span>
            <span className="text-xs text-nexura-400">
              Coordinator accounts are provisioned by the team — contact the
              faculty coordinator to get one.
            </span>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-nexura-200 mb-1.5">
                Full name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-nexura-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={form.name}
                  onChange={update("name")}
                  placeholder="Aarav Mehta"
                  className="w-full rounded-lg bg-white/5 border border-white/15 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-nexura-400 focus:border-nexura-300 focus:ring-2 focus:ring-nexura-400/20 outline-none transition-all"
                />
              </div>
              {errors.name && (
                <p className="text-xs text-red-400 mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-nexura-200 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-nexura-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  placeholder="you@nexura.club"
                  className="w-full rounded-lg bg-white/5 border border-white/15 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-nexura-400 focus:border-nexura-300 focus:ring-2 focus:ring-nexura-400/20 outline-none transition-all"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400 mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-nexura-200 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-nexura-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={form.password}
                  onChange={update("password")}
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg bg-white/5 border border-white/15 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-nexura-400 focus:border-nexura-300 focus:ring-2 focus:ring-nexura-400/20 outline-none transition-all"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 mt-1">{errors.password}</p>
              )}
              {errors.form && (
                <p className="text-xs text-red-400 mt-1">{errors.form}</p>
              )}
            </div>

            <button type="submit" className="btn-primary w-full py-3 mt-2">
              Create member account <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-sm text-nexura-300 mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-white font-semibold hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
