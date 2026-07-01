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
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Reset</p>
        <h1 className="mt-3 font-display font-semibold leading-[1.05] tracking-tight text-[clamp(2.25rem,5vw,3.25rem)]">
          Forgot your <span className="text-primary">password?</span>
        </h1>
        <p className="mt-3 text-[15px] text-muted-foreground">We’ll email you a secure reset link.</p>
      </div>

      <div className="fade-up mt-9" style={{ animationDelay: "80ms" }}>
        {status === "success" ? (
          <div>
            <div role="status" className="mb-6 flex items-start gap-2 text-sm text-primary">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{message}</p>
            </div>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {status === "error" && (
              <div role="alert" className="flex items-start gap-2 text-sm text-down">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{message}</p>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="email" className="block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
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
                className="field-line"
              />
            </div>

            <button type="submit" disabled={status === "loading"} className="btn btn-primary w-full py-3.5 text-base">
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
