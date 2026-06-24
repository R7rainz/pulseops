"use client";

import { useActionState, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/constants";
import {
  Activity, AlertTriangle, CheckCircle, ArrowLeft,
  Eye, EyeOff, Check, XCircle,
} from "lucide-react";
import Link from "next/link";

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "One number" },
  { test: (p: string) => /[@$!%*?&]/.test(p), label: "One special character (@$!%*?&)" },
] as const;

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [state, formAction, isPending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const password = formData.get("password") as string;
      const confirm = formData.get("confirmPassword") as string;

      if (password !== confirm) {
        return { error: "Passwords do not match." };
      }

      for (const rule of PASSWORD_RULES) {
        if (!rule.test(password)) {
          return { error: `Password must have: ${PASSWORD_RULES.filter(r => !r.test(password)).map(r => r.label).join(", ")}` };
        }
      }

      try {
        const res = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });

        const json = await res.json();

        if (!res.ok) {
          return { error: json.message || "Reset failed." };
        }

        return { success: "Password has been reset. You can now log in with your new password." };
      } catch {
        return { error: "Network error. Please try again." };
      }
    },
    null,
  );

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  if (!token) {
    return (
      <div className="text-center">
        <div className="p-4 bg-red-950/30 border-2 border-red-500/50 flex items-start gap-3 text-sm text-red-400 mb-6">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>Invalid reset link. No token provided.</p>
        </div>
        <Link
          href="/forgot-password"
          className="text-cyan-400 hover:text-cyan-300 hover:underline font-bold uppercase tracking-wide text-sm"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (state?.success) {
    return (
      <div className="text-center">
        <div className="p-4 bg-emerald-950/30 border-2 border-emerald-500/50 flex items-start gap-3 text-sm text-emerald-400 mb-6">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{state.success}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" />
          Proceed to Login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="p-4 bg-red-950/30 border-2 border-red-500/50 flex items-start gap-3 text-sm text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{state.error}</p>
        </div>
      )}

      {emailParam && (
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold text-center">
          Resetting password for <span className="text-zinc-300">{emailParam}</span>
        </p>
      )}

      <input type="hidden" name="token" value={token} />

      <div className="space-y-2">
        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">
          New Password
        </label>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="New password"
            className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-3 pr-12 text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors rounded-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {password && (
          <ul className="mt-2 space-y-1">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(password);
              return (
                <li
                  key={rule.label}
                  className={`flex items-center gap-2 text-[11px] font-bold tracking-wider ${
                    ok ? "text-emerald-400" : "text-zinc-600"
                  }`}
                >
                  {ok ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {rule.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">
          Confirm New Password
        </label>
        <div className="relative">
          <input
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            required
            placeholder="Confirm new password"
            className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-3 pr-12 text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors rounded-none"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {confirmPwd && password !== confirmPwd && (
          <p className="mt-1.5 text-[11px] text-red-400 font-bold tracking-wider flex items-center gap-1.5">
            <XCircle className="w-3 h-3" />
            Passwords do not match
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-widest py-4 border-2 border-transparent transition-all disabled:opacity-50 rounded-none"
      >
        {isPending ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-mono flex items-center justify-center p-6 selection:bg-emerald-500/30 selection:text-emerald-400">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500 opacity-[0.05] blur-[150px] pointer-events-none animate-pulse" />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-10 text-center">
          <div className="inline-flex p-3 bg-zinc-900 border-2 border-zinc-800 mb-6">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold uppercase tracking-widest text-zinc-100">
            New<span className="text-emerald-400">Credentials</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-2 uppercase tracking-wide">
            Set a new password for your account
          </p>
        </div>

        <div className="bg-zinc-950 border-2 border-zinc-800 p-8 shadow-[8px_8px_0px_0px_rgba(52,211,153,0.1)]">
          <Suspense fallback={<p className="text-zinc-500 text-sm text-center">Loading...</p>}>
            <ResetForm />
          </Suspense>
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
