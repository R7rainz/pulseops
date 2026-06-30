"use client";

import { useState } from "react";
import { API_URL } from "@/lib/constants";
import { AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";
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
    <div>
      <div className="fade-up">
        <h1 className="font-display text-[1.75rem] font-semibold tracking-tight text-foreground">Reset your password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">We’ll email you a secure reset link</p>
      </div>

      <div className="fade-up mt-8" style={{ animationDelay: "80ms" }}>
        {status === "success" ? (
          <div>
            <div role="status" className="mb-6 flex items-start gap-2.5 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{message}</p>
            </div>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-info transition-colors hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {status === "error" && (
              <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{message}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="field"
              />
            </div>

            <button type="submit" disabled={status === "loading"} className="btn btn-primary w-full py-3">
              {status === "loading" ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
      </div>

      <p className="fade-up mt-7" style={{ animationDelay: "160ms" }}>
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
