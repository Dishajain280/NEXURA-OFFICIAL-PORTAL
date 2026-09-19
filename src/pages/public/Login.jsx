import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Zap,
  Mail,
  Lock,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { isCoordinatorRole } from "../../lib/roleGuard";

export default function Login() {
  const { login, pushToast } = useApp();
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("aarav.mehta@nexura.club");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!email.trim()) errs.email = "Email is required";
    if (!password.trim()) errs.password = "Password is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const authState = await login(role, email, password);
      pushToast(
        `Welcome back! Logged in as ${isCoordinatorRole(authState.role) ? "coordinator" : "member"}.`,
      );
      const isCoord = isCoordinatorRole(authState?.role);
      navigate(isCoord ? "/coordinator/dashboard" : "/student/dashboard");
    } catch (error) {
      setErrors({ form: error.message || "Login failed" });
      pushToast(error.message || "Login failed", "danger");
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
            Welcome back
          </h1>
          <p className="text-sm text-nexura-300 text-center mt-1.5">
            Log in to your Nexura account
          </p>

          <div className="grid grid-cols-2 gap-2 mt-6 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setRole("student")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                role === "student"
                  ? "bg-white text-nexura-700 shadow"
                  : "text-nexura-200 hover:text-white"
              }`}
            >
              <GraduationCap className="w-4 h-4" /> Student
            </button>
            <button
              type="button"
              onClick={() => setRole("coordinator")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                role === "coordinator"
                  ? "bg-white text-nexura-700 shadow"
                  : "text-nexura-200 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Coordinator
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-nexura-200 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-nexura-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-white/5 border border-white/15 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-nexura-400 focus:border-nexura-300 focus:ring-2 focus:ring-nexura-400/20 outline-none transition-all"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 mt-1">{errors.password}</p>
              )}
              {errors.form && (
                <p className="text-xs text-red-400 mt-2">{errors.form}</p>
              )}
              <p className="text-xs text-nexura-400 mt-2">
                Use your university email and password from Supabase Auth.
              </p>
            </div>

            <button type="submit" className="btn-primary w-full py-3 mt-2">
              Log in as {role === "coordinator" ? "coordinator" : "member"}{" "}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-sm text-nexura-300 mt-6">
            Registration is closed. Contact your coordinator for access.
          </p>
        </div>
      </div>
    </div>
  );
}
