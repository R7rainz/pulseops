"use client";

import { useActionState } from "react";
import { createWorkspace } from "../actions";
import { TerminalSquare, PlusSquare, AlertTriangle } from "lucide-react";

export default function NewWorkspacePage() {
  // 🚨 THE FIX: Wire up the action state properly!
  const [state, formAction, isPending] = useActionState(createWorkspace, undefined);

  return (
    <main className="p-10 text-[#EEEAE0] min-h-screen bg-transparent flex flex-col items-center justify-center">
      <div className="w-full max-w-lg relative z-10">
        {/* Header Component */}
        <div className="mb-10 text-center">
          <div className="inline-flex p-3 bg-transparent border border-[rgba(238,234,224,0.06)] mb-6">
            <TerminalSquare className="w-6 h-6 text-[#9FD8BD]" />
          </div>
          <h1 className="text-3xl font-medium text-[#EEEAE0]">
            Initialize <span className="text-[#9FD8BD]">Target</span>
          </h1>
          <p className="text-[#93A096] text-sm mt-2">
            Provision a new isolated workspace environment
          </p>
        </div>

        {/* Sharp Form Block */}
        <div className="bg-transparent border border-[rgba(238,234,224,0.06)] p-8">
          <form action={formAction} className="space-y-8">
            {/* 🚨 THE FIX: Error State Display */}
            {state?.error && (
              <div className="p-4 bg-[rgba(194,118,107,0.1)] border border-[#C2766B]/50 flex items-start gap-3 text-sm text-[#C2766B]">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p className="pt-0.5">{state.error}</p>
              </div>
            )}

            <div className="space-y-3">
              <label
                htmlFor="name"
                className="block text-xs font-medium text-[#93A096] border-b border-[rgba(238,234,224,0.08)] pb-2"
              >
                Workspace Designation
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#93A096] font-medium">
                  $
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g., prod-cluster-alpha"
                  required
                  className="w-full bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.06)] pl-10 pr-4 py-3 text-[#EEEAE0] placeholder:text-[rgba(238,234,224,0.2)] focus:outline-none focus:border-[#9FD8BD] transition-colors rounded-[4px]"
                />
              </div>
              <p className="text-[10px] text-[#93A096] mt-2">
                * Identifier must be unique to your operator profile.
              </p>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-3 bg-[#9FD8BD] hover:bg-[#9FD8BD] text-zinc-950 font-medium py-4 rounded-[999px] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
