"use client";

import { useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signupUser } from "../auth.actions";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import OAuthButtons from "@/components/OAuthButtons";

function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupUser, {});
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite_token");

  return (
    <div>
      <div className="fade-up">
        <h1 className="font-display text-[1.75rem] font-semibold tracking-tight text-foreground">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Start monitoring in under a minute</p>
      </div>

      <div className="fade-up mt-8" style={{ animationDelay: "60ms" }}>
        <OAuthButtons label="Or sign up with email" />
      </div>

      <form action={formAction} className="fade-up mt-6 space-y-5" style={{ animationDelay: "80ms" }}>
        {inviteToken && <input type="hidden" name="invite_token" value={inviteToken} />}
        {state?.error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{state.error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium text-foreground">
            Name
          </label>
          <input id="name" name="name" type="text" autoComplete="name" required placeholder="Your name" className="field" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" className="field" />
        </div>

        <PasswordInput id="password" name="password" label="Password" autoComplete="new-password" required placeholder="At least 8 characters" />

        <button type="submit" disabled={isPending} className="btn btn-primary w-full py-3">
          {isPending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="fade-up mt-7 text-sm text-muted-foreground" style={{ animationDelay: "160ms" }}>
        Already have an account?{" "}
        <Link
          href={`/login${inviteToken ? `?invite_token=${inviteToken}` : ""}`}
          className="font-medium text-primary transition-colors hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
