"use client";

import { useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ShieldCheck } from "lucide-react";
import { verify2fa } from "../auth.actions";

function TwoFactorForm() {
  const [state, formAction, isPending] = useActionState(verify2fa, {});
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const inviteToken = searchParams.get("invite_token");

  return (
    <div>
      <div className="fade-up">
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h1 className="font-display text-[1.75rem] font-semibold tracking-tight text-foreground">Two-factor verification</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app, or a recovery code.
        </p>
      </div>

      <form action={formAction} className="fade-up mt-8 space-y-5" style={{ animationDelay: "80ms" }}>
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
        {inviteToken && <input type="hidden" name="invite_token" value={inviteToken} />}
        {state?.error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{state.error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="code" className="block text-sm font-medium text-foreground">
            Verification code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            autoFocus
            required
            placeholder="123456"
            className="field tracking-[0.3em]"
          />
        </div>

        <button type="submit" disabled={isPending} className="btn btn-primary w-full py-3">
          {isPending ? "Verifying…" : "Verify & sign in"}
        </button>
      </form>

      <p className="fade-up mt-7" style={{ animationDelay: "160ms" }}>
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function TwoFactorPage() {
  return (
    <Suspense>
      <TwoFactorForm />
    </Suspense>
  );
}
