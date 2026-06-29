"use client";

import { useActionState, useState } from "react";
import { changePassword } from "./actions";
import { Key, AlertTriangle, CheckCircle, XCircle, Check } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "One number" },
  { test: (p: string) => /[@$!%*?&]/.test(p), label: "One special character (@$!%*?&)" },
] as const;

export default function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, {});
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <div className="glass mb-6 rounded-lg p-6">
      <h2 className="mb-5 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
        <Key className="h-4 w-4 text-degraded" /> Change password
      </h2>
      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{state.error}</p>
          </div>
        )}
        {state?.success && (
          <div role="status" className="flex items-start gap-2.5 rounded-lg border border-up/40 bg-up/10 p-3 text-sm text-up">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{state.success}</p>
          </div>
        )}

        <PasswordInput id="currentPassword" name="currentPassword" label="Current password" autoComplete="current-password" required placeholder="Current password" />

        <div>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            label="New password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            placeholder="New password"
          />
          {newPassword && (
            <ul className="mt-2 space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(newPassword);
                return (
                  <li key={rule.label} className={`flex items-center gap-2 text-[11px] ${ok ? "text-up" : "text-muted-foreground"}`}>
                    {ok ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm new password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm new password"
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-down">
              <XCircle className="h-3 w-3" /> Passwords do not match
            </p>
          )}
        </div>

        <button type="submit" disabled={isPending} className="btn btn-accent text-degraded border-degraded/40 bg-degraded/10">
          {isPending ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
