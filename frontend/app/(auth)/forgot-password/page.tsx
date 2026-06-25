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
    <div className="min-h-screen flex items-center justify-center p-6 selection:bg-[#9FD8BD]/20 selection:text-[#9FD8BD]">
      <div className="w-full max-w-md relative z-10">
        <div className="mb-10 text-center">
          <div className="inline-flex p-3 bg-[rgba(159,216,189,0.1)] border border-[rgba(159,216,189,0.2)] rounded-[4px] mb-6">
            <Activity className="w-6 h-6 text-[#9FD8BD]" />
          </div>
          <h1 className="text-3xl font-medium text-[#EEEAE0]">
            Reset<span className="text-[#9FD8BD]">Access</span>
          </h1>
          <p className="text-[#93A096] text-body-md mt-2">
            Recover your account credentials
          </p>
        </div>

        <div className="gradient-border-shell">
          <div className="shell-inner p-[29.6px]">
            {status === "success" ? (
              <div className="text-center">
                <div className="p-4 bg-[rgba(159,216,189,0.1)] border border-[rgba(159,216,189,0.2)] rounded-[4px] flex items-start gap-3 text-sm text-[#9FD8BD] mb-6">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{message}</p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-[#9FD8BD] hover:text-[#9FD8BD]/80 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {status === "error" && (
                  <div className="p-4 bg-[rgba(194,118,107,0.1)] border border-[rgba(194,118,107,0.3)] rounded-[4px] flex items-start gap-3 text-sm text-[#C2766B]">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>{message}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-label-md text-[#93A096]"
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
                    className="w-full bg-[rgba(238,234,224,0.03)] border border-[rgba(238,234,224,0.15)] rounded-[9px] px-[12px] py-[10px] text-sm text-[#EEEAE0] placeholder:text-[#93A096]/40 focus-visible:border-[#9FD8BD] focus-visible:ring-2 focus-visible:ring-[rgba(159,216,189,0.2)] outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full bg-[#EEEAE0] hover:bg-[#EEEAE0]/90 text-[#0A0F0C] rounded-[999px] px-[15.2px] py-[11px] text-label-md font-medium border-0 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {status === "loading" ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-[#9FD8BD] hover:text-[#9FD8BD]/80 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
