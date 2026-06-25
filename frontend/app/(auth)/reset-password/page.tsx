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
        <div className="p-4 bg-[rgba(194,118,107,0.1)] border border-[rgba(194,118,107,0.3)] rounded-[4px] flex items-start gap-3 text-sm text-[#C2766B] mb-6">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>Invalid reset link. No token provided.</p>
        </div>
        <Link
          href="/forgot-password"
          className="text-sm text-[#9FD8BD] hover:text-[#9FD8BD]/80 font-medium"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (state?.success) {
    return (
      <div className="text-center">
        <div className="p-4 bg-[rgba(159,216,189,0.1)] border border-[rgba(159,216,189,0.2)] rounded-[4px] flex items-start gap-3 text-sm text-[#9FD8BD] mb-6">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{state.success}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-[#9FD8BD] hover:text-[#9FD8BD]/80 font-medium"
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
        <div className="p-4 bg-[rgba(194,118,107,0.1)] border border-[rgba(194,118,107,0.3)] rounded-[4px] flex items-start gap-3 text-sm text-[#C2766B]">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{state.error}</p>
        </div>
      )}

      {emailParam && (
        <p className="text-body-md text-[#93A096] text-center">
          Resetting password for <span className="text-[#EEEAE0]">{emailParam}</span>
        </p>
      )}

      <input type="hidden" name="token" value={token} />

      <div className="space-y-2">
        <label className="text-label-md text-[#93A096]">
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
            className="w-full bg-[rgba(238,234,224,0.03)] border border-[rgba(238,234,224,0.15)] rounded-[9px] px-[12px] py-[10px] pr-12 text-sm text-[#EEEAE0] placeholder:text-[#93A096]/40 focus-visible:border-[#9FD8BD] focus-visible:ring-2 focus-visible:ring-[rgba(159,216,189,0.2)] outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#93A096] hover:text-[#EEEAE0] transition-colors"
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
                  className={`flex items-center gap-2 text-[11px] font-medium ${
                    ok ? "text-[#9FD8BD]" : "text-[#93A096]/60"
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
        <label className="text-label-md text-[#93A096]">
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
            className="w-full bg-[rgba(238,234,224,0.03)] border border-[rgba(238,234,224,0.15)] rounded-[9px] px-[12px] py-[10px] pr-12 text-sm text-[#EEEAE0] placeholder:text-[#93A096]/40 focus-visible:border-[#9FD8BD] focus-visible:ring-2 focus-visible:ring-[rgba(159,216,189,0.2)] outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#93A096] hover:text-[#EEEAE0] transition-colors"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {confirmPwd && password !== confirmPwd && (
          <p className="mt-1.5 text-[11px] text-[#C2766B] font-medium flex items-center gap-1.5">
            <XCircle className="w-3 h-3" />
            Passwords do not match
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-[#EEEAE0] hover:bg-[#EEEAE0]/90 text-[#0A0F0C] rounded-[999px] px-[15.2px] py-[11px] text-label-md font-medium border-0 transition-all disabled:opacity-50 cursor-pointer"
      >
        {isPending ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 selection:bg-[#9FD8BD]/20 selection:text-[#9FD8BD]">
      <div className="w-full max-w-md relative z-10">
        <div className="mb-10 text-center">
          <div className="inline-flex p-3 bg-[rgba(159,216,189,0.1)] border border-[rgba(159,216,189,0.2)] rounded-[4px] mb-6">
            <Activity className="w-6 h-6 text-[#9FD8BD]" />
          </div>
          <h1 className="text-3xl font-medium text-[#EEEAE0]">
            New<span className="text-[#9FD8BD]">Credentials</span>
          </h1>
          <p className="text-[#93A096] text-body-md mt-2">
            Set a new password for your account
          </p>
        </div>

        <div className="gradient-border-shell">
          <div className="shell-inner p-[29.6px]">
            <Suspense fallback={<p className="text-[#93A096] text-sm text-center">Loading...</p>}>
              <ResetForm />
            </Suspense>
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
