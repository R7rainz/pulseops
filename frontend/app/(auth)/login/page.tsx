"use client";

import { useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loginUser } from "../auth.actions";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginUser, {});
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const inviteToken = searchParams.get("invite_token");

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your PulseOps account</p>
      </div>

      <div className="pulse-shell">
        <div className="p-7">
          <form action={formAction} className="space-y-5">
            {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
            {inviteToken && <input type="hidden" name="invite_token" value={inviteToken} />}
            {state?.error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{state.error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
                className="field"
              />
            </div>

            <PasswordInput id="password" name="password" label="Password" autoComplete="current-password" required placeholder="••••••••" />

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs font-medium text-info transition-colors hover:text-up">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={isPending} className="btn btn-primary w-full py-3">
              {isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link
          href={`/signup${inviteToken ? `?invite_token=${inviteToken}` : ""}`}
          className="font-medium text-up transition-colors hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
