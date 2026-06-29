"use client";

import { useActionState } from "react";
import { createWorkspace } from "../actions";
import { Plus, AlertTriangle } from "lucide-react";

export default function NewWorkspacePage() {
  const [state, formAction, isPending] = useActionState(createWorkspace, undefined);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Create a workspace</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">An isolated environment for your monitors and team</p>
        </div>

        <div className="pulse-shell">
          <div className="p-7">
            <form action={formAction} className="space-y-5">
              {state?.error && (
                <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{state.error}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-sm font-medium text-foreground">Workspace name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g. Production"
                  required
                  className="field"
                />
                <p className="text-xs text-muted-foreground">Must be unique to your account.</p>
              </div>

              <button type="submit" disabled={isPending} className="btn btn-primary w-full py-3">
                <Plus className="h-4 w-4" />
                {isPending ? "Creating…" : "Create workspace"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
