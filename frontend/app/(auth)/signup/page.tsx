"use client";

import { useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signupUser } from "../auth.actions";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupUser, {});
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite_token");

  return (
    <div>
      <div className="fade-up">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Get started</p>
        <h1 className="mt-3 font-display font-semibold leading-[1.05] tracking-tight text-[clamp(2.25rem,5vw,3.25rem)]">
          Start <span className="text-primary">monitoring.</span>
        </h1>
        <p className="mt-3 text-[15px] text-muted-foreground">Spin up your first monitor in under a minute.</p>
      </div>

      <form action={formAction} className="fade-up mt-9 space-y-6" style={{ animationDelay: "80ms" }}>
        {inviteToken && <input type="hidden" name="invite_token" value={inviteToken} />}
        {state?.error && (
          <div role="alert" className="flex items-start gap-2 text-sm text-down">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{state.error}</p>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="name" className="block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Name
          </label>
          <input id="name" name="name" type="text" autoComplete="name" required placeholder="Your name" className="field-line" />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" className="field-line" />
        </div>

        <PasswordInput id="password" name="password" label="Password" variant="line" autoComplete="new-password" required placeholder="At least 8 characters" />

        <button type="submit" disabled={isPending} className="btn btn-primary group w-full py-3.5 text-base">
          {isPending ? "Creating account…" : "Create account"}
          {!isPending && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </form>

      <p className="fade-up mt-8 text-sm text-muted-foreground" style={{ animationDelay: "160ms" }}>
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
