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
    <div className="glass rounded-[9px] p-[18px] mb-8">
      <h2 className="text-sm font-medium text-[#EEEAE0] mb-6 flex items-center gap-2">
        <Key className="w-4 h-4 text-[#E2A356]" />
        Change Password
      </h2>
      <form action={formAction} className="space-y-5">
        {state?.error && (
          <div className="p-4 bg-[rgba(194,118,107,0.1)] border border-[rgba(194,118,107,0.3)] rounded-[4px] flex items-start gap-3 text-sm text-[#C2766B]">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{state.error}</p>
          </div>
        )}
        {state?.success && (
          <div className="p-4 bg-[rgba(159,216,189,0.1)] border border-[rgba(159,216,189,0.3)] rounded-[4px] flex items-start gap-3 text-sm text-[#9FD8BD]">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{state.success}</p>
          </div>
        )}
        <div>
          <label className="text-label-md text-[#93A096] block mb-1.5">
            Current Password
          </label>
          <div className="relative">
            <input
              name="currentPassword"
              type={showCurrent ? "text" : "password"}
              autoComplete="off"
              className="w-full bg-[rgba(238,234,224,0.03)] border border-[rgba(238,234,224,0.15)] rounded-[9px] px-[12px] py-[10px] pr-12 text-sm text-[#EEEAE0] placeholder:text-[#93A096]/40 focus-visible:border-[#9FD8BD] focus-visible:ring-2 focus-visible:ring-[rgba(159,216,189,0.2)] outline-none transition-colors"
              placeholder="Current password"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#93A096] hover:text-[#EEEAE0] transition-colors"
              tabIndex={-1}
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-label-md text-[#93A096] block mb-1.5">
            New Password
          </label>
          <div className="relative">
            <input
              name="newPassword"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[rgba(238,234,224,0.03)] border border-[rgba(238,234,224,0.15)] rounded-[9px] px-[12px] py-[10px] pr-12 text-sm text-[#EEEAE0] placeholder:text-[#93A096]/40 focus-visible:border-[#9FD8BD] focus-visible:ring-2 focus-visible:ring-[rgba(159,216,189,0.2)] outline-none transition-colors"
              placeholder="New password"
              required
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#93A096] hover:text-[#EEEAE0] transition-colors"
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
                    className={`flex items-center gap-2 text-body-md font-medium ${
                      ok ? "text-[#9FD8BD]" : "text-[#93A096]"
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
          <label className="text-label-md text-[#93A096] block mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[rgba(238,234,224,0.03)] border border-[rgba(238,234,224,0.15)] rounded-[9px] px-[12px] py-[10px] pr-12 text-sm text-[#EEEAE0] placeholder:text-[#93A096]/40 focus-visible:border-[#9FD8BD] focus-visible:ring-2 focus-visible:ring-[rgba(159,216,189,0.2)] outline-none transition-colors"
              placeholder="Confirm new password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#93A096] hover:text-[#EEEAE0] transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="mt-1.5 text-body-md text-[#C2766B] font-medium flex items-center gap-1.5">
              <XCircle className="w-3 h-3" />
              Passwords do not match
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-[#E2A356] hover:bg-[#E2A356]/90 text-[#0A0F0C] rounded-[999px] text-label-md font-medium border-0 transition-all disabled:opacity-50"
        >
          {isPending ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
