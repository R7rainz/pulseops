"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  Plus,
  Activity,
  LogOut,
  Settings,
  TerminalSquare,
  AlertTriangle,
  Radio,
  Eye,
  UserPlus,
  CreditCard,
} from "lucide-react";
import { logoutUser } from "@/app/(auth)/auth.actions";

export default function Sidebar({ workspaces }: { workspaces: any[] }) {
  const pathname = usePathname();

  return (
    <aside className="w-72 border-r-2 border-zinc-900 bg-zinc-950 flex flex-col justify-between h-screen sticky top-0 z-50">
      {/* LOGO */}
      <div className="px-5 pt-5 pb-4 border-b-2 border-zinc-900/50">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-500/10 border-2 border-emerald-500/30">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="font-bold text-lg tracking-widest text-zinc-100 uppercase">
            Pulse<span className="text-emerald-400">Ops</span>
          </span>
        </div>
      </div>

      {/* SCROLLABLE NAV AREA */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-5 space-y-8">
        {/* WORKSPACES */}
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
              Workspaces
            </h2>
            <Link
              href="/workspaces/new"
              className="p-1 border-2 border-zinc-800 text-zinc-500 hover:text-emerald-400 hover:border-emerald-500 transition-colors"
              title="New Workspace"
            >
              <Plus className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {workspaces.length === 0 ? (
              <p className="text-xs text-zinc-600 px-2 py-3 italic font-medium">
                No workspaces yet.
              </p>
            ) : (
              workspaces.map((ws: any) => {
                const wsBase = `/workspaces/${ws.id}`;
                const statusPath = `/status/${ws.slug}`;
                const isMonitors = pathname === `${wsBase}/monitors`;
                const isIncidents = pathname === `${wsBase}/incidents`;
                const isInvites = pathname === `${wsBase}/invites`;
                const isBilling = pathname === `${wsBase}/billing`;
                const isSettings = pathname === `${wsBase}/settings`;
                const isStatus = pathname === statusPath;
                const isActive = isMonitors || isIncidents || isBilling || isInvites || isSettings || isStatus;

                return (
                  <div
                    key={ws.id}
                    className={`group border-2 transition-colors ${
                      isActive
                        ? "border-emerald-900/50 bg-emerald-950/10"
                        : "border-zinc-900 hover:border-zinc-800 bg-zinc-950"
                    }`}
                  >
                    {/* WORKSPACE HEADER */}
                    <Link
                      href={`${wsBase}/monitors`}
                      className={`flex items-center gap-3 px-3 py-3 text-sm font-bold transition-colors ${
                        isActive
                          ? "text-emerald-400"
                          : "text-zinc-300 hover:text-zinc-100"
                      }`}
                    >
                      <Layers className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate uppercase tracking-widest">
                        {ws.name}
                      </span>
                    </Link>

                    {/* SUB-NAV — always visible when active, otherwise on hover */}
                    <div className={`divide-y divide-zinc-900 transition-all duration-200 overflow-hidden ${
                      isActive
                        ? "max-h-96 opacity-100 visible"
                        : "max-h-0 opacity-0 invisible group-hover:max-h-96 group-hover:opacity-100 group-hover:visible"
                    }`}>
                      <div className="border-t border-zinc-900" />
                      <NavItem
                        href={`${wsBase}/monitors`}
                        icon={<Radio className="w-3.5 h-3.5" />}
                        label="Monitors"
                        isActive={isMonitors}
                      />
                      <NavItem
                        href={`${wsBase}/incidents`}
                        icon={<AlertTriangle className="w-3.5 h-3.5" />}
                        label="Incidents"
                        isActive={isIncidents}
                      />
                      <NavItem
                        href={`${wsBase}/invites`}
                        icon={<UserPlus className="w-3.5 h-3.5" />}
                        label="Invites"
                        isActive={isInvites}
                      />
                      <NavItem
                        href={`${wsBase}/billing`}
                        icon={<CreditCard className="w-3.5 h-3.5" />}
                        label="Billing"
                        isActive={isBilling}
                      />
                      <NavItem
                        href={`${wsBase}/settings`}
                        icon={<Settings className="w-3.5 h-3.5" />}
                        label="Settings"
                        isActive={isSettings}
                      />
                      <NavItem
                        href={statusPath}
                        icon={<Eye className="w-3.5 h-3.5" />}
                        label="Status Page"
                        isActive={isStatus}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* GLOBAL NAV */}
        <section>
          <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-4 px-2">
            System
          </h2>
          <div className="space-y-1">
            <GlobalNavItem
              href="/webhooks"
              icon={<TerminalSquare className="w-4 h-4" />}
              label="Webhooks"
              isActive={pathname === "/webhooks"}
            />
          </div>
        </section>
      </nav>

      {/* PROFILE & LOGOUT */}
      <div className="px-3 py-4 border-t-2 border-zinc-900 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center text-cyan-400">
            <TerminalSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-zinc-200 truncate uppercase tracking-widest">
              OP: RAINZ
            </p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest truncate">
              Root Access
            </p>
          </div>
        </div>

        <form action={logoutUser}>
          <button
            type="submit"
            className="flex items-center justify-between w-full px-3 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-red-400 border-2 border-zinc-900 hover:border-red-800 hover:bg-red-950/20 transition-all group cursor-pointer"
          >
            <span>Terminate Session</span>
            <LogOut className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>
        </form>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon,
  label,
  isActive,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
        isActive
          ? "bg-emerald-950/20 text-emerald-400 border-l-2 border-emerald-500"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 border-l-2 border-transparent"
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      {label}
    </Link>
  );
}

function GlobalNavItem({
  href,
  icon,
  label,
  isActive,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors border-2 ${
        isActive
          ? "bg-zinc-900 border-emerald-800/50 text-emerald-400 shadow-[2px_2px_0px_0px_rgba(52,211,153,0.08)]"
          : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 hover:border-zinc-800"
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      {label}
    </Link>
  );
}
