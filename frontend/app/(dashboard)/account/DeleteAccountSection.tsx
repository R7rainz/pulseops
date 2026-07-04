"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import { deleteAccount } from "./actions";

export default function DeleteAccountSection({ hasPassword }: { hasPassword: boolean }) {
  const [state, formAction, isPending] = useActionState(deleteAccount, {});
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  return (
    <div className="mt-6 rounded-lg border border-down/40 bg-down/5 p-6">
      <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-semibold text-down">
        <AlertTriangle className="h-4 w-4" /> Danger zone
      </h2>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        Deleting your account is permanent. Any workspaces you own — along with all their monitors,
        incidents, webhooks and API keys — are removed for everyone in them. This can’t be undone.
      </p>

      {!confirming ? (
        <button onClick={() => setConfirming(true)} className="btn btn-danger inline-flex items-center gap-2">
          <Trash2 className="h-4 w-4" /> Delete account
        </button>
      ) : (
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{state.error}</p>
            </div>
          )}

          {hasPassword && (
            <PasswordInput
              id="delete-password"
              name="password"
              label="Confirm your password"
              autoComplete="current-password"
              required
              placeholder="Your password"
            />
          )}

          <div className="space-y-1.5">
            <label htmlFor="delete-confirm" className="block text-sm font-medium text-foreground">
              Type <span className="font-mono text-down">DELETE</span> to confirm
            </label>
            <input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="field max-w-[240px]"
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending || confirmText !== "DELETE"}
              className="btn btn-danger inline-flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isPending ? "Deleting…" : "Permanently delete account"}
            </button>
            <button
              type="button"
              onClick={() => { setConfirming(false); setConfirmText(""); }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
