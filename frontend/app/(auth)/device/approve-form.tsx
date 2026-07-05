"use client";

import { useActionState } from "react";
import { AlertTriangle, CheckCircle2, Terminal } from "lucide-react";
import { approveDevice, type ApproveState } from "./actions";

export default function ApproveForm({ initialCode }: { initialCode: string }) {
  const [state, formAction, isPending] = useActionState<ApproveState, FormData>(
    approveDevice,
    {},
  );

  if (state.success) {
    return (
      <div className="fade-up">
        <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-up/40 bg-up/10 text-up">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="font-display text-[1.75rem] font-semibold tracking-tight text-foreground">
          Device authorized
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You can close this tab and return to your terminal — it&apos;s signed in now.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="fade-up flex items-center gap-2.5 text-muted-foreground">
        <Terminal className="h-5 w-5" />
        <span className="text-xs font-medium uppercase tracking-widest">Device login</span>
      </div>

      <div className="fade-up mt-4" style={{ animationDelay: "40ms" }}>
        <h1 className="font-display text-[1.75rem] font-semibold tracking-tight text-foreground">
          Authorize this device
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          A device is requesting access to your PulseOps account. Confirm the code
          below matches the one shown in your terminal, then approve.
        </p>
      </div>

      <form
        action={formAction}
        className="fade-up mt-7 space-y-5"
        style={{ animationDelay: "80ms" }}
      >
        {state.error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{state.error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="userCode" className="block text-sm font-medium text-foreground">
            Device code
          </label>
          <input
            id="userCode"
            name="userCode"
            type="text"
            required
            autoFocus={!initialCode}
            defaultValue={initialCode}
            placeholder="XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="field text-center font-mono text-lg uppercase tracking-[0.3em]"
          />
        </div>

        <button type="submit" disabled={isPending} className="btn btn-primary w-full py-3">
          {isPending ? "Authorizing…" : "Authorize device"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Didn&apos;t start this from your terminal? Don&apos;t approve it.
        </p>
      </form>
    </div>
  );
}
