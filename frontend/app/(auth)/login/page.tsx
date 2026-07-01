"use client";

import { useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loginUser } from "../auth.actions";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginUser, {});
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const inviteToken = searchParams.get("invite_token");

  return (
    <div>
      <div className="fade-up">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Sign in</p>
        <h1 className="mt-3 font-display font-semibold leading-[1.05] tracking-tight text-[clamp(2.25rem,5vw,3.25rem)]">
          Welcome <span className="text-primary">back.</span>
        </h1>
        <p className="mt-3 text-[15px] text-muted-foreground">Pick up right where your systems left off.</p>
      </div>

      <form action={formAction} className="fade-up mt-9 space-y-6" style={{ animationDelay: "80ms" }}>
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
        {inviteToken && <input type="hidden" name="invite_token" value={inviteToken} />}
        {state?.error && (
          <div role="alert" className="flex items-start gap-2 text-sm text-down">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{state.error}</p>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" className="field-line" />
        </div>

        <PasswordInput id="password" name="password" label="Password" variant="line" autoComplete="current-password" required placeholder="••••••••" />

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary">
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={isPending} className="btn btn-primary group w-full py-3.5 text-base">
          {isPending ? "Signing in…" : "Sign in"}
          {!isPending && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </form>

      <p className="fade-up mt-8 text-sm text-muted-foreground" style={{ animationDelay: "160ms" }}>
        No account?{" "}
        <Link
          href={`/signup${inviteToken ? `?invite_token=${inviteToken}` : ""}`}
          className="font-medium text-primary transition-colors hover:underline"
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
