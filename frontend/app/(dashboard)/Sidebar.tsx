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
  Zap,
  User,
} from "lucide-react";
import { logoutUser } from "@/app/(auth)/auth.actions";

export default function Sidebar({ workspaces, user }: { workspaces: any[]; user: { name: string; email: string } }) {
  const pathname = usePathname();

  return (
    <aside className="w-72 glass border-r border-[rgba(238,234,224,0.08)] flex flex-col justify-between h-screen sticky top-0 z-50">
      {/* LOGO */}
      <div className="px-5 pt-5 pb-4 border-b border-[rgba(238,234,224,0.06)]">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[rgba(159,216,189,0.1)] border border-[rgba(159,216,189,0.2)] rounded-[4px]">
            <Activity className="w-5 h-5 text-[#9FD8BD]" />
          </div>
          <span className="font-medium text-lg tracking-wider text-[#EEEAE0]">
            Pulse<span className="text-[#9FD8BD]">Ops</span>
          </span>
        </div>
      </div>

      {/* SCROLLABLE NAV AREA */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-5 space-y-8">
        {/* WORKSPACES */}
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-label-md text-[#93A096]">
              Workspaces
            </h2>
            <Link
              href="/workspaces/new"
              className="p-1 border border-[rgba(238,234,224,0.1)] rounded-[999px] text-[#93A096] hover:text-[#9FD8BD] hover:border-[#9FD8BD]/30 transition-colors"
              title="New Workspace"
            >
              <Plus className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {workspaces.length === 0 ? (
              <p className="text-body-md text-[#93A096]/60 px-2 py-3 italic font-medium">
                No workspaces yet.
              </p>
            ) : (
              workspaces.map((ws: any) => {
                const wsBase = `/workspaces/${ws.id}`;
                const statusPath = `/status/${ws.slug}`;
                const isMonitors = pathname.startsWith(`${wsBase}/monitors`);
                const isIncidents = pathname.startsWith(`${wsBase}/incidents`);
                const isInvites = pathname === `${wsBase}/invites`;
                const isBilling = pathname === `${wsBase}/billing`;
                const isSettings = pathname === `${wsBase}/settings`;
                const isStatus = pathname === statusPath;
                const isWebhooks = pathname.startsWith(`${wsBase}/webhooks/`);
                const isActive = isMonitors || isIncidents || isBilling || isInvites || isSettings || isStatus || isWebhooks;

                return (
                  <div
                    key={ws.id}
                    className={`group rounded-[4px] border transition-all ${
                      isActive
                        ? "border-[#9FD8BD]/30 bg-[rgba(159,216,189,0.06)]"
                        : "border-transparent bg-transparent hover:border-[rgba(238,234,224,0.1)] hover:bg-[rgba(238,234,224,0.03)]"
                    }`}
                  >
                    {/* WORKSPACE HEADER */}
                    <Link
                      href={`${wsBase}/monitors`}
                      className={`flex items-center gap-3 px-3 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "text-[#9FD8BD]"
                          : "text-[#93A096] hover:text-[#EEEAE0]"
                      }`}
                    >
                      <Layers className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">
                        {ws.name}
                      </span>
                    </Link>

                    {/* SUB-NAV */}
                    <div className={`divide-y divide-[rgba(238,234,224,0.04)] transition-all duration-[300ms] ease-[cubic-bezier(0.19,1,0.22,1)] overflow-hidden ${
                      isActive
                        ? "max-h-96 opacity-100 visible"
                        : "max-h-0 opacity-0 invisible group-hover:max-h-96 group-hover:opacity-100 group-hover:visible"
                    }`}>
                      <div className="border-t border-[rgba(238,234,224,0.04)]" />
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
                      <NavItem
                        href={`${wsBase}/webhooks`}
                        icon={<Zap className="w-3.5 h-3.5" />}
                        label="Webhooks"
                        isActive={isWebhooks}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

      </nav>

      {/* PROFILE & LOGOUT */}
      <div className="px-3 py-4 border-t border-[rgba(238,234,224,0.06)] space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-[rgba(238,234,224,0.05)] border border-[rgba(238,234,224,0.1)] rounded-[4px] flex items-center justify-center text-[#9FD8BD]">
            <TerminalSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#EEEAE0] truncate">
              {user.name ? `OP: ${user.name}` : "OP: OPERATOR"}
            </p>
            <p className="text-body-md text-[#93A096] truncate">
              {user.email || "No email"}
            </p>
          </div>
        </div>

        <Link
          href="/account"
          className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors rounded-[4px] border ${
            pathname === "/account"
              ? "border-[#9FD8BD]/30 bg-[rgba(159,216,189,0.06)] text-[#9FD8BD]"
              : "border-transparent text-[#93A096] hover:text-[#EEEAE0] hover:bg-[rgba(238,234,224,0.03)] hover:border-[rgba(238,234,224,0.1)]"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          My Account
        </Link>

        <form action={logoutUser}>
          <button
            type="submit"
            className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-[#93A096] hover:text-[#C2766B] rounded-[4px] border border-transparent hover:border-[rgba(194,118,107,0.2)] hover:bg-[rgba(194,118,107,0.05)] transition-all cursor-pointer"
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
      className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-[300ms] ${
        isActive
          ? "bg-[rgba(159,216,189,0.08)] text-[#9FD8BD] border-l border-[#9FD8BD]"
          : "text-[#93A096] hover:text-[#EEEAE0] hover:bg-[rgba(238,234,224,0.03)] border-l border-transparent"
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      {label}
    </Link>
  );
}
