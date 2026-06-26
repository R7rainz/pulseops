"use client";

import { useActionState, useState } from "react";
import { changePassword } from "./actions";
import {
  Key, Eye, EyeOff, AlertTriangle, CheckCircle,
  XCircle, Check,
} from "lucide-react";

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "One number" },
  { test: (p: string) => /[@$!%*?&]/.test(p), label: "One special character (@$!%*?&)" },
] as const;

export default function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, {});
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <div className="border-2 border-zinc-900 bg-zinc-950 p-6 mb-8">
      <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest mb-6 flex items-center gap-2">
        <Key className="w-4 h-4 text-amber-400" />
        Change Password
      </h2>
      <form action={formAction} className="space-y-5">
        {state?.error && (
          <div className="p-4 bg-red-950/30 border-2 border-red-500/50 flex items-start gap-3 text-sm text-red-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{state.error}</p>
          </div>
        )}
        {state?.success && (
          <div className="p-4 bg-emerald-950/30 border-2 border-emerald-500/50 flex items-start gap-3 text-sm text-emerald-400">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{state.success}</p>
          </div>
        )}
        <div>
          <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold block mb-1.5">
            Current Password
          </label>
          <div className="relative">
            <input
              name="currentPassword"
              type={showCurrent ? "text" : "password"}
              autoComplete="off"
              className="w-full px-3 py-2.5 bg-zinc-950 border-2 border-zinc-800 text-zinc-200 text-sm tracking-widest font-bold placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors pr-10"
              placeholder="Current password"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
              tabIndex={-1}
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold block mb-1.5">
            New Password
          </label>
          <div className="relative">
            <input
              name="newPassword"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-950 border-2 border-zinc-800 text-zinc-200 text-sm tracking-widest font-bold placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors pr-10"
              placeholder="New password"
              required
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
              tabIndex={-1}
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {newPassword && (
            <ul className="mt-2 space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(newPassword);
                return (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-2 text-[11px] font-bold tracking-wider ${
                      ok ? "text-emerald-400" : "text-zinc-600"
                    }`}
                  >
                    {ok ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div>
          <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold block mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-950 border-2 border-zinc-800 text-zinc-200 text-sm tracking-widest font-bold placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors pr-10"
              placeholder="Confirm new password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="mt-1.5 text-[11px] text-red-400 font-bold tracking-wider flex items-center gap-1.5">
              <XCircle className="w-3 h-3" />
              Passwords do not match
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
        >
          {isPending ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
