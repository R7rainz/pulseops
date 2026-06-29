"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  Plus,
  LogOut,
  Settings,
  AlertTriangle,
  Radio,
  Eye,
  UserPlus,
  CreditCard,
  Zap,
  User,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/Brand";
import ThemeToggle from "@/components/ThemeToggle";
import { logoutUser } from "@/app/(auth)/auth.actions";

interface Workspace {
  id: number | string;
  name: string;
  slug: string;
}

export default function Sidebar({
  workspaces,
  user,
}: {
  workspaces: Workspace[];
  user: { name: string; email: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // close the mobile drawer whenever the route changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closing the drawer in response to navigation
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* MOBILE TOP BAR */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md lg:hidden">
        <Brand href="/workspaces" size="sm" />
        <button
          onClick={() => setOpen(true)}
          className="icon-btn"
          aria-label="Open navigation menu"
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* SCRIM */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-border bg-surface transition-transform duration-300 lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* LOGO */}
        <div className="flex h-14 items-center justify-between border-b border-border px-5">
          <Brand href="/workspaces" />
          <button onClick={() => setOpen(false)} className="icon-btn h-8 w-8 lg:hidden" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* NAV */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          <section>
            <div className="mb-3 flex items-center justify-between px-2">
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Workspaces
              </h2>
              <Link href="/workspaces/new" className="icon-btn h-7 w-7 hover:text-primary hover:border-primary/40" title="New workspace" aria-label="New workspace">
                <Plus className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-1.5">
              {workspaces.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">No workspaces yet.</p>
              ) : (
                workspaces.map((ws) => {
                  const wsBase = `/workspaces/${ws.id}`;
                  const statusPath = `/status/${ws.slug}`;
                  const isMonitors = pathname.startsWith(`${wsBase}/monitors`);
                  const isIncidents = pathname.startsWith(`${wsBase}/incidents`);
                  const isInvites = pathname === `${wsBase}/invites`;
                  const isBilling = pathname === `${wsBase}/billing`;
                  const isSettings = pathname === `${wsBase}/settings`;
                  const isStatus = pathname === statusPath;
                  const isWebhooks = pathname.startsWith(`${wsBase}/webhooks`);
                  const isActive =
                    isMonitors || isIncidents || isBilling || isInvites || isSettings || isStatus || isWebhooks;

                  return (
                    <div
                      key={ws.id}
                      className={cn(
                        "overflow-hidden rounded-lg border transition-colors",
                        isActive ? "border-primary/20 bg-primary/[0.04]" : "border-transparent hover:border-border",
                      )}
                    >
                      <Link
                        href={`${wsBase}/monitors`}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive ? "text-primary" : "text-foreground/80 hover:text-foreground",
                        )}
                      >
                        <Layers className="h-4 w-4 shrink-0" />
                        <span className="truncate font-display tracking-tight">{ws.name}</span>
                      </Link>

                      <div
                        className={cn(
                          "overflow-hidden transition-all duration-200",
                          isActive
                            ? "max-h-96 opacity-100"
                            : "max-h-0 opacity-0 group-hover:max-h-96",
                        )}
                      >
                        <div className="space-y-0.5 px-2 pb-2">
                          <NavItem href={`${wsBase}/monitors`} icon={<Radio className="h-3.5 w-3.5" />} label="Monitors" isActive={isMonitors} />
                          <NavItem href={`${wsBase}/incidents`} icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Incidents" isActive={isIncidents} />
                          <NavItem href={`${wsBase}/webhooks`} icon={<Zap className="h-3.5 w-3.5" />} label="Webhooks" isActive={isWebhooks} />
                          <NavItem href={`${wsBase}/invites`} icon={<UserPlus className="h-3.5 w-3.5" />} label="Invites" isActive={isInvites} />
                          <NavItem href={`${wsBase}/billing`} icon={<CreditCard className="h-3.5 w-3.5" />} label="Billing" isActive={isBilling} />
                          <NavItem href={`${wsBase}/settings`} icon={<Settings className="h-3.5 w-3.5" />} label="Settings" isActive={isSettings} />
                          <NavItem href={statusPath} icon={<Eye className="h-3.5 w-3.5" />} label="Status page" isActive={isStatus} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </nav>

        {/* PROFILE & LOGOUT */}
        <div className="space-y-2 border-t border-border p-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 font-display text-sm font-semibold text-primary">
              {(user.name || user.email || "?").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user.name || "Operator"}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{user.email || "—"}</p>
            </div>
            <ThemeToggle className="h-8 w-8 shrink-0" />
          </div>

          <Link
            href="/account"
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/account"
                ? "bg-primary/[0.06] text-primary"
                : "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
            )}
          >
            <User className="h-4 w-4" />
            Account
          </Link>

          <form action={logoutUser}>
            <button
              type="submit"
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-down/10 hover:text-down"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
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
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
        isActive
          ? "bg-primary/[0.08] text-primary"
          : "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
      )}
    >
      <span className="shrink-0">{icon}</span>
      {label}
    </Link>
  );
}
