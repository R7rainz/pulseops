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
  OWNER: "text-[#E2A356] border-[rgba(226,163,86,0.3)] bg-[rgba(226,163,86,0.08)]",
  ADMIN: "text-[#A3D1DF] border-[rgba(163,209,223,0.3)] bg-[rgba(163,209,223,0.08)]",
  MEMBER: "text-[#9FD8BD] border-[rgba(159,216,189,0.3)] bg-[rgba(159,216,189,0.08)]",
  VIEWER: "text-[#93A096] border-[rgba(238,234,224,0.1)] bg-[rgba(238,234,224,0.03)]",
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
    <div className="glass rounded-[9px]">
      <div className="px-5 py-3 border-b border-[rgba(238,234,224,0.06)] flex items-center gap-2">
        <p className="text-sm font-medium text-[#93A096] flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-[#9FD8BD]" />
          Team Roster
        </p>
        <span className="text-body-md text-[#93A096]/60 ml-auto">{members.length} operator(s)</span>
      </div>
      <div className="divide-y divide-[rgba(238,234,224,0.04)]">
        {ROLE_ORDER.map((role) => {
          const roleMembers = groups[role];
          if (!roleMembers) return null;
          return (
            <div key={role}>
              <div className={`px-5 py-2 flex items-center gap-2 text-[11px] font-medium ${ROLE_COLORS[role]}`}>
                {ROLE_ICONS[role]}
                {role} — {roleMembers.length}
              </div>
              {roleMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[rgba(238,234,224,0.02)] transition-colors">
                  <div className="w-8 h-8 flex-shrink-0 bg-[rgba(238,234,224,0.05)] border border-[rgba(238,234,224,0.1)] rounded-[4px] flex items-center justify-center">
                    <span className="text-xs font-medium text-[#93A096]">
                      {(m.user.name || m.user.email)[0]}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#EEEAE0] truncate">
                      {m.user.name || "Unnamed"}
                    </p>
                    <p className="text-body-md text-[#93A096] truncate">{m.user.email}</p>
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
