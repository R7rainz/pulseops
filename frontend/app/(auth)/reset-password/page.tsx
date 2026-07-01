"use client";

import { useActionState, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/constants";
import { AlertTriangle, CheckCircle, ArrowLeft, Check, XCircle } from "lucide-react";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";

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
          return {
            error: `Password must have: ${PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.label).join(", ")}`,
          };
        }
      }

      try {
        const res = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });

        const json = await res.json();
        if (!res.ok) return { error: json.message || "Reset failed." };
        return { success: "Password has been reset. You can now sign in with your new password." };
      } catch {
        return { error: "Network error. Please try again." };
      }
    },
    null,
  );

  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  if (!token) {
    return (
      <div className="text-center">
        <div role="alert" className="mb-6 flex items-start gap-2 text-left text-sm text-down">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Invalid reset link. No token provided.</p>
        </div>
        <Link href="/forgot-password" className="text-sm font-medium text-primary transition-colors hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (state?.success) {
    return (
      <div className="text-center">
        <div role="status" className="mb-6 flex items-start gap-2 text-left text-sm text-primary">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{state.success}</p>
        </div>
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Proceed to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div role="alert" className="flex items-start gap-2 text-sm text-down">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      {emailParam && (
        <p className="text-center text-xs text-muted-foreground">
          Resetting password for <span className="text-foreground">{emailParam}</span>
        </p>
      )}

      <input type="hidden" name="token" value={token} />

      <div className="space-y-2">
        <PasswordInput
          id="password"
          name="password"
          label="New password"
          variant="line"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="New password"
        />
        {password && (
          <ul className="mt-2 space-y-1">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(password);
              return (
                <li key={rule.label} className={`flex items-center gap-2 text-[11px] ${ok ? "text-primary" : "text-muted-foreground"}`}>
                  {ok ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {rule.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-1.5">
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm new password"
          variant="line"
          autoComplete="new-password"
          value={confirmPwd}
          onChange={(e) => setConfirmPwd(e.target.value)}
          required
          placeholder="Confirm new password"
        />
        {confirmPwd && password !== confirmPwd && (
          <p className="flex items-center gap-1.5 text-[11px] text-down">
            <XCircle className="h-3 w-3" />
            Passwords do not match
          </p>
        )}
      </div>

      <button type="submit" disabled={isPending} className="btn btn-primary w-full py-3">
        {isPending ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div>
      <div className="fade-up">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Reset</p>
        <h1 className="mt-3 font-display font-semibold leading-[1.05] tracking-tight text-[clamp(2.25rem,5vw,3.25rem)]">
          Set a new <span className="text-primary">password.</span>
        </h1>
        <p className="mt-3 text-[15px] text-muted-foreground">Choose a strong password for your account.</p>
      </div>

      <div className="fade-up mt-9" style={{ animationDelay: "80ms" }}>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <ResetForm />
        </Suspense>
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
