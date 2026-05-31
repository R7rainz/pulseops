"use client";

import { useActionState } from "react";
import { createWorkspace } from "../actions";
import { TerminalSquare, PlusSquare, AlertTriangle } from "lucide-react";

export default function NewWorkspacePage() {
  // 🚨 THE FIX: Wire up the action state properly!
  const [state, formAction, isPending] = useActionState(createWorkspace, {});

  return (
    <main className="p-10 font-mono text-zinc-50 min-h-screen bg-transparent flex flex-col items-center justify-center">
      <div className="w-full max-w-lg relative z-10">
        {/* Header Component */}
        <div className="mb-10 text-center">
          <div className="inline-flex p-3 bg-zinc-950 border-2 border-zinc-800 mb-6 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.1)]">
            <TerminalSquare className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold uppercase tracking-widest text-zinc-100">
            Initialize <span className="text-emerald-400">Target</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-2 uppercase tracking-wide">
            Provision a new isolated workspace environment
          </p>
        </div>

        {/* Sharp Form Block */}
        <div className="bg-zinc-950 border-2 border-zinc-800 p-8 shadow-[8px_8px_0px_0px_rgba(52,211,153,0.1)]">
          <form action={formAction} className="space-y-8">
            {/* 🚨 THE FIX: Error State Display */}
            {state?.error && (
              <div className="p-4 bg-red-950/30 border-2 border-red-500/50 flex items-start gap-3 text-sm text-red-400">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p className="pt-0.5">{state.error}</p>
              </div>
            )}

            <div className="space-y-3">
              <label
                htmlFor="name"
                className="block text-xs font-bold text-zinc-400 uppercase tracking-widest border-b-2 border-zinc-900 pb-2"
              >
                Workspace Designation
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-600 font-bold">
                  $
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g., prod-cluster-alpha"
                  required
                  className="w-full bg-zinc-900 border-2 border-zinc-800 pl-10 pr-4 py-3 text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors rounded-none font-mono"
                />
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-2">
                * Identifier must be unique to your operator profile.
              </p>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-widest py-4 border-2 border-transparent transition-all rounded-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <PlusSquare className="w-4 h-4" />
              {isPending ? "Executing..." : "Execute Provisioning"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
