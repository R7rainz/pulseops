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
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-mono flex items-center justify-center p-6 selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* Background Pulse matching the Core Theme */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500 opacity-[0.05] blur-[150px] pointer-events-none animate-pulse" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex p-3 bg-zinc-900 border-2 border-zinc-800 mb-6">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold uppercase tracking-widest text-zinc-100">
            Auth<span className="text-emerald-400">Gateway</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-2 uppercase tracking-wide">
            Establish Secure Session
          </p>
        </div>

        {/* Sharp Materialistic Form Box with Offset Shadow */}
        <div className="bg-zinc-950 border-2 border-zinc-800 p-8 shadow-[8px_8px_0px_0px_rgba(52,211,153,0.1)]">
          <form action={formAction} className="space-y-6">
            {callbackUrl && (
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
            )}
            {inviteToken && (
              <input type="hidden" name="invite_token" value={inviteToken} />
            )}
            {state?.error && (
              <div className="p-4 bg-red-950/30 border-2 border-red-500/50 flex items-start gap-3 text-sm text-red-400">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p className="pt-0.5">{state.error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-xs font-bold text-zinc-400 uppercase tracking-widest"
              >
                Email Identity
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="admin@pulseops.dev"
                className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors rounded-none"
              />
            </div>

            <PasswordInput
              id="password"
              name="password"
              label="Access Token"
              required
              placeholder="••••••••"
            />

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-widest py-4 border-2 border-transparent transition-all disabled:opacity-50 rounded-none"
            >
              {isPending ? "Authenticating..." : "Initialize Session"}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-sm">
            No active profile?{" "}
            <Link
              href={`/signup${inviteToken ? `?invite_token=${inviteToken}` : ""}`}
              className="text-cyan-400 hover:text-cyan-300 hover:underline font-bold uppercase tracking-wide"
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
