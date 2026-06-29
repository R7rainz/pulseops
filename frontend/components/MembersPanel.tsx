import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { apiFetch } from "@/lib/apiFetch";
import Link from "next/link";
import { Crown, Shield, User, Settings, Users } from "lucide-react";

interface Member {
  id: number;
  userId: number;
  role: string;
  createdAt: string;
  user: { id: number; name: string | null; email: string; createdAt: string };
}

const ROLE_ORDER = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];
const ROLE_META: Record<string, { chip: string; icon: React.ReactNode }> = {
  OWNER: { chip: "text-degraded border-degraded/30 bg-degraded/10", icon: <Crown className="h-3 w-3" /> },
  ADMIN: { chip: "text-info border-info/30 bg-info/10", icon: <Shield className="h-3 w-3" /> },
  MEMBER: { chip: "text-up border-up/30 bg-up/10", icon: <User className="h-3 w-3" /> },
  VIEWER: { chip: "text-paused border-paused/30 bg-paused/10", icon: <User className="h-3 w-3" /> },
};

export default async function MembersPanel({ workspaceId }: { workspaceId: string }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return null;

  let members: Member[] = [];
  try {
    const res = await apiFetch(`${API_URL}/api/v1/workspaces/${workspaceId}/members`, {
      token,
      cookieStore,
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      members = json.data || [];
    }
  } catch {}

  if (members.length === 0) return null;

  const groups: Record<string, Member[]> = {};
  for (const role of ROLE_ORDER) {
    const filtered = members
      .filter((m) => m.role === role)
      .sort((a, b) => (a.user.name || a.user.email).localeCompare(b.user.name || b.user.email));
    if (filtered.length > 0) groups[role] = filtered;
  }

  return (
    <div className="glass overflow-hidden rounded-lg">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <Users className="h-4 w-4 text-up" />
        <p className="font-display text-sm font-semibold text-foreground">Team</p>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{members.length}</span>
      </div>

      <div className="divide-y divide-border">
        {ROLE_ORDER.map((role) => {
          const roleMembers = groups[role];
          if (!roleMembers) return null;
          const meta = ROLE_META[role];
          return (
            <div key={role} className="py-1">
              <div className="flex items-center px-5 py-1.5">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${meta.chip}`}>
                  {meta.icon}
                  {role.toLowerCase()}
                </span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{roleMembers.length}</span>
              </div>
              {roleMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-2 transition-colors hover:bg-surface-raised/50">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-xs font-semibold uppercase text-muted-foreground">
                    {(m.user.name || m.user.email)[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{m.user.name || "Unnamed"}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{m.user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <Link
        href={`/workspaces/${workspaceId}/settings`}
        className="flex items-center gap-2 border-t border-border px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-raised/50 hover:text-up"
      >
        <Settings className="h-3.5 w-3.5" />
        Manage in settings
      </Link>
    </div>
  );
}
