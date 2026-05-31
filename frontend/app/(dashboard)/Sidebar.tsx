"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  Plus,
  Activity,
  LogOut,
  LayoutDashboard,
  Settings,
  TerminalSquare,
} from "lucide-react";
import { logoutUser } from "@/app/(auth)/auth.actions";

export default function Sidebar({ workspaces }: { workspaces: any[] }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r-2 border-zinc-900 bg-zinc-950 flex flex-col justify-between p-5 h-screen sticky top-0 z-50">
      <div className="space-y-8">
        {/* Logo Brand */}
        <div className="flex items-center gap-3 px-1 pb-6 border-b-2 border-zinc-900/50">
          <div className="p-1.5 bg-emerald-500/10 border-2 border-emerald-500/30">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="font-bold text-lg tracking-widest text-zinc-100 uppercase">
            Pulse<span className="text-emerald-400">Ops</span>
          </span>
        </div>

        {/* Workspaces Management Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
            <span>Targets / Workspaces</span>
            <Link
              href="/workspaces/new"
              className="hover:text-emerald-400 transition-colors p-1 border-2 border-transparent hover:border-zinc-800 bg-zinc-900/50"
              title="Provision Workspace"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {workspaces.map((ws: any) => {
              const isActive = pathname === `/workspaces/${ws.id}/monitors`;
              return (
                <Link
                  key={ws.id}
                  href={`/workspaces/${ws.id}/monitors`}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all group ${
                    isActive
                      ? "bg-zinc-900 border-l-2 border-emerald-400 text-zinc-100 shadow-[2px_2px_0px_0px_rgba(52,211,153,0.1)]"
                      : "text-zinc-400 hover:text-zinc-100 border-l-2 border-transparent hover:border-zinc-700 hover:bg-zinc-900/50"
                  }`}
                >
                  <Layers
                    className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-emerald-400" : "text-zinc-600 group-hover:text-cyan-400 transition-colors"}`}
                  />
                  <span className="truncate flex-1 tracking-wide">
                    {ws.name}
                  </span>
                </Link>
              );
            })}

            {workspaces.length === 0 && (
              <p className="text-xs text-zinc-600 px-3 py-2 italic font-medium">
                No active targets.
              </p>
            )}
          </div>
        </div>

        {/* Quick System Links */}
        <nav className="space-y-2">
          <span className="block px-1 text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3">
            System Commands
          </span>
          <Link
            href="/"
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all ${
              pathname === "/"
                ? "bg-zinc-900 border-l-2 border-emerald-400 text-zinc-100 shadow-[2px_2px_0px_0px_rgba(52,211,153,0.1)]"
                : "text-zinc-400 hover:text-zinc-100 border-l-2 border-transparent hover:border-zinc-700 hover:bg-zinc-900/50"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-emerald-400" />
            <span className="tracking-wide">Metrics Hub</span>
          </Link>
          <button
            disabled
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-600 border-l-2 border-transparent cursor-not-allowed"
          >
            <Settings className="w-4 h-4" />
            <span className="tracking-wide">Global Config</span>
          </button>
        </nav>
      </div>

      {/* TERMINAL PROFILE & LOGOUT */}
      <div className="pt-6 border-t-2 border-zinc-900">
        {/* Strict Operator Profile Block */}
        <div className="px-2 pb-5 mb-5 border-b-2 border-zinc-900/50 flex items-center gap-3">
          <div className="w-9 h-9 bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center text-cyan-400">
            <TerminalSquare className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-zinc-200 truncate uppercase tracking-widest">
              OP: RAINZ
            </p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate mt-0.5">
              Root Access
            </p>
          </div>
        </div>

        <form action={logoutUser}>
          <button
            type="submit"
            className="flex items-center justify-between w-full px-3 py-3 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-950 border-2 border-transparent hover:border-red-500 hover:bg-red-500 transition-all group cursor-pointer"
          >
            <span className="truncate block group-hover:hidden">
              Session Active
            </span>
            <span className="truncate hidden group-hover:block">Terminate</span>
            <LogOut className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>
        </form>
      </div>
    </aside>
  );
}
