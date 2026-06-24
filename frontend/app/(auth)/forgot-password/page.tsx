"use client";

import { useState } from "react";
import { API_URL } from "@/lib/constants";
import { Activity, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(json.message || "Something went wrong.");
        return;
      }

      setStatus("success");
      setMessage(json.message || "Check your email for the reset link.");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-mono flex items-center justify-center p-6 selection:bg-emerald-500/30 selection:text-emerald-400">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500 opacity-[0.05] blur-[150px] pointer-events-none animate-pulse" />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-10 text-center">
          <div className="inline-flex p-3 bg-zinc-900 border-2 border-zinc-800 mb-6">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold uppercase tracking-widest text-zinc-100">
            Reset<span className="text-emerald-400">Access</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-2 uppercase tracking-wide">
            Recover your account credentials
          </p>
        </div>

        <div className="bg-zinc-950 border-2 border-zinc-800 p-8 shadow-[8px_8px_0px_0px_rgba(52,211,153,0.1)]">
          {status === "success" ? (
            <div className="text-center">
              <div className="p-4 bg-emerald-950/30 border-2 border-emerald-500/50 flex items-start gap-3 text-sm text-emerald-400 mb-6">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>{message}</p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-widest"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {status === "error" && (
                <div className="p-4 bg-red-950/30 border-2 border-red-500/50 flex items-start gap-3 text-sm text-red-400">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{message}</p>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-xs font-bold text-zinc-400 uppercase tracking-widest"
                >
                  Email Identity
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@pulseops.dev"
                  className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors rounded-none"
                />
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-widest py-4 border-2 border-transparent transition-all disabled:opacity-50 rounded-none"
              >
                {status === "loading" ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="text-cyan-400 hover:text-cyan-300 hover:underline font-bold uppercase tracking-wide text-sm"
          >
            <ArrowLeft className="w-4 h-4 inline mr-1" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
