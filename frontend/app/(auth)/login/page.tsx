"use client";

import { useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loginUser } from "../auth.actions";
import Link from "next/link";
import { Activity, AlertTriangle } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginUser, {});
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const inviteToken = searchParams.get("invite_token");

  return (
    <div className="min-h-screen flex items-center justify-center p-6 selection:bg-[#9FD8BD]/20 selection:text-[#9FD8BD]">
      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex p-3 bg-[rgba(159,216,189,0.1)] border border-[rgba(159,216,189,0.2)] rounded-[4px] mb-6">
            <Activity className="w-6 h-6 text-[#9FD8BD]" />
          </div>
          <h1 className="text-3xl font-medium text-[#EEEAE0]">
            Auth<span className="text-[#9FD8BD]">Gateway</span>
          </h1>
          <p className="text-[#93A096] text-body-md mt-2">
            Establish Secure Session
          </p>
        </div>

        {/* Glass Form Card */}
        <div className="gradient-border-shell">
          <div className="shell-inner p-[29.6px]">
            <form action={formAction} className="space-y-6">
              {callbackUrl && (
                <input type="hidden" name="callbackUrl" value={callbackUrl} />
              )}
              {inviteToken && (
                <input type="hidden" name="invite_token" value={inviteToken} />
              )}
              {state?.error && (
                <div className="p-4 bg-[rgba(194,118,107,0.1)] border border-[rgba(194,118,107,0.3)] rounded-[4px] flex items-start gap-3 text-sm text-[#C2766B]">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p className="pt-0.5">{state.error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-label-md text-[#93A096]"
                >
                  Email Identity
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="admin@pulseops.dev"
                  className="w-full bg-[rgba(238,234,224,0.03)] border border-[rgba(238,234,224,0.15)] rounded-[9px] px-[12px] py-[10px] text-sm text-[#EEEAE0] placeholder:text-[#93A096]/40 focus-visible:border-[#9FD8BD] focus-visible:ring-2 focus-visible:ring-[rgba(159,216,189,0.2)] outline-none transition-colors"
                />
              </div>

              <PasswordInput
                id="password"
                name="password"
                label="Access Token"
                required
                placeholder="••••••••"
              />

              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-label-md text-[#93A096] hover:text-[#EEEAE0] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-[#EEEAE0] hover:bg-[#EEEAE0]/90 text-[#0A0F0C] rounded-[999px] px-[15.2px] py-[11px] text-label-md font-medium border-0 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Authenticating..." : "Initialize Session"}
              </button>
            </form>
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-8 text-center">
          <p className="text-body-md text-[#93A096]">
            No active profile?{" "}
            <Link
              href={`/signup${inviteToken ? `?invite_token=${inviteToken}` : ""}`}
              className="text-[#9FD8BD] hover:text-[#9FD8BD]/80 hover:underline font-medium"
            >
              Provision one
            </Link>
          </p>
        </div>
      </div>
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
