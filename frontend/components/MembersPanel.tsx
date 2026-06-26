import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { apiFetch } from "@/lib/apiFetch";
import { Crown, Shield, User, Mail } from "lucide-react";

interface Member {
  id: number;
  userId: number;
  role: string;
  createdAt: string;
  user: { id: number; name: string | null; email: string; createdAt: string };
}

const ROLE_ORDER = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];
const ROLE_COLORS: Record<string, string> = {
  OWNER: "text-amber-400 border-amber-800 bg-amber-950/20",
  ADMIN: "text-purple-400 border-purple-800 bg-purple-950/20",
  MEMBER: "text-cyan-400 border-cyan-800 bg-cyan-950/20",
  VIEWER: "text-zinc-400 border-zinc-700 bg-zinc-900",
};
const ROLE_ICONS: Record<string, React.ReactNode> = {
  OWNER: <Crown className="w-3 h-3" />,
  ADMIN: <Shield className="w-3 h-3" />,
  MEMBER: <User className="w-3 h-3" />,
  VIEWER: <User className="w-3 h-3" />,
};

export default async function MembersPanel({ workspaceId }: { workspaceId: string }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) return null;

  let members: Member[] = [];
  try {
    const res = await apiFetch(
      `${API_URL}/api/v1/workspaces/${workspaceId}/members`,
      { token, cookieStore, cache: "no-store" },
    );
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
    <div className="border-2 border-zinc-800 bg-zinc-950 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.03)]">
      <div className="px-5 py-3 border-b-2 border-zinc-900 flex items-center gap-2">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-emerald-400" />
          Team Roster
        </p>
        <span className="text-[10px] text-zinc-600 ml-auto">{members.length} operator(s)</span>
      </div>
      <div className="divide-y divide-zinc-900">
        {ROLE_ORDER.map((role) => {
          const roleMembers = groups[role];
          if (!roleMembers) return null;
          return (
            <div key={role}>
              <div className={`px-5 py-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${ROLE_COLORS[role]}`}>
                {ROLE_ICONS[role]}
                {role} — {roleMembers.length}
              </div>
              {roleMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-900/30 transition-colors">
                  <div className="w-8 h-8 flex-shrink-0 bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center">
                    <span className="text-xs font-bold text-zinc-400 uppercase">
                      {(m.user.name || m.user.email)[0]}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-200 truncate uppercase tracking-widest">
                      {m.user.name || "Unnamed"}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate">{m.user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
