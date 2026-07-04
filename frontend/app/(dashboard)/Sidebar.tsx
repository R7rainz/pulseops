"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
  Plus,
  SunMoon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/Brand";
import ThemeToggle from "@/components/ThemeToggle";
import { logoutUser } from "@/app/(auth)/auth.actions";
import WorkspaceSwitcher, { type Workspace } from "./WorkspaceSwitcher";

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

  // Active workspace = the one in the URL, else the first one.
  const urlWsId = pathname.match(/^\/workspaces\/([^/]+)/)?.[1] ?? null;
  const active =
    workspaces.find((w) => String(w.id) === urlWsId) ?? workspaces[0] ?? null;
  const wsBase = active ? `/workspaces/${active.id}` : null;

  const on = (suffix: string, exact = false) => {
    if (!wsBase) return false;
    const full = `${wsBase}${suffix}`;
    return exact ? pathname === full : pathname.startsWith(full);
  };

  const homeHref = wsBase ? `${wsBase}/monitors` : "/";

  return (
    <>
      {/* MOBILE TOP BAR */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md lg:hidden">
        <Brand href={homeHref} size="sm" />
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
          <Brand href={homeHref} />
          <button onClick={() => setOpen(false)} className="icon-btn h-8 w-8 lg:hidden" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* WORKSPACE SWITCHER — outside the scroll area so its dropdown isn't clipped */}
        {workspaces.length > 0 && (
          <div className="px-4 pt-4">
            <WorkspaceSwitcher workspaces={workspaces} active={active} />
          </div>
        )}

        {/* NAV */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {workspaces.length === 0 ? (
            <div className="space-y-3 px-1 pt-1">
              <p className="text-sm text-muted-foreground">No workspaces yet.</p>
              <Link href="/workspaces/new" className="btn btn-primary w-full">
                <Plus className="h-4 w-4" /> Create workspace
              </Link>
            </div>
          ) : (
            <>
              <NavGroup label="Monitoring">
                <NavItem href={`${wsBase}/monitors`} icon={<Radio className="h-4 w-4" />} label="Monitors" isActive={on("/monitors")} />
                <NavItem href={`${wsBase}/incidents`} icon={<AlertTriangle className="h-4 w-4" />} label="Incidents" isActive={on("/incidents")} />
              </NavGroup>

              <NavGroup label="Sharing">
                <NavItem href={`${wsBase}/status`} icon={<Eye className="h-4 w-4" />} label="Status page" isActive={on("/status", true)} />
                <NavItem href={`${wsBase}/invites`} icon={<UserPlus className="h-4 w-4" />} label="Invites" isActive={on("/invites", true)} />
              </NavGroup>

              <NavGroup label="Settings">
                <NavItem href={`${wsBase}/webhooks`} icon={<Zap className="h-4 w-4" />} label="Webhooks" isActive={on("/webhooks")} />
                <NavItem href={`${wsBase}/billing`} icon={<CreditCard className="h-4 w-4" />} label="Billing" isActive={on("/billing", true)} />
                <NavItem href={`${wsBase}/settings`} icon={<Settings className="h-4 w-4" />} label="Settings" isActive={on("/settings", true)} />
              </NavGroup>
            </>
          )}
        </nav>

        {/* ACCOUNT */}
        <div className="border-t border-border p-3">
          <h2 className="mb-2 px-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Account
          </h2>

          <div className="space-y-0.5">
            <Link
              href="/account"
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/account"
                  ? "bg-primary/[0.08] text-primary"
                  : "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
              )}
            >
              <User className="h-4 w-4" />
              Account
            </Link>

            <div className="flex items-center justify-between rounded-lg px-3 py-1.5">
              <span className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
                <SunMoon className="h-4 w-4" />
                Theme
              </span>
              <ThemeToggle className="h-8 w-8 shrink-0" />
            </div>

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

          {/* Identity */}
          <div className="mt-2 flex items-center gap-3 border-t border-border px-2 pt-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 font-display text-sm font-semibold text-primary">
              {(user.name || user.email || "?").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user.name || "Operator"}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{user.email || "—"}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-3 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </h2>
      <div className="space-y-0.5">{children}</div>
    </section>
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
  const className = cn(
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary/[0.08] text-primary"
      : "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
  );

  return (
    <Link href={href} aria-current={isActive ? "page" : undefined} className={className}>
      <span className="shrink-0">{icon}</span>
      {label}
    </Link>
  );
}
