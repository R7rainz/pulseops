"use client";

import { Crown, Trash2 } from "lucide-react";
import { removeMember, updateMemberRole } from "./members-actions";

interface Member {
  id: number;
  userId: number;
  role: string;
  createdAt: string;
  user: { id: number; name: string | null; email: string };
}

export default function TeamMembers({
  members,
  workspaceId,
  canEdit,
  currentUserId,
}: {
  members: Member[];
  workspaceId: string;
  canEdit: boolean;
  currentUserId: number | null;
}) {
  const rank: Record<string, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2, VIEWER: 3 };
  const sorted = [...members].sort((a, b) =>
    (rank[a.role] ?? 99) - (rank[b.role] ?? 99) ||
    (a.user.name || a.user.email).localeCompare(b.user.name || b.user.email)
  );

  return (
    <div className="divide-y-2 divide-zinc-900">
      {sorted.map((m) => {
        const isSelf = m.userId === currentUserId;
        const isOwner = m.role === "OWNER";
        const canManage = canEdit && !isOwner;
        return (
          <div key={m.id} className="flex items-center gap-4 py-3">
            <div className="w-9 h-9 flex-shrink-0 bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center">
              <span className="text-xs font-bold text-zinc-400 uppercase">
                {(m.user.name || m.user.email)[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-200 uppercase tracking-wider truncate flex items-center gap-2">
                {m.user.name || "Unnamed"}
                {isSelf && (
                  <span className="text-[10px] text-zinc-500 font-normal normal-case">(you)</span>
                )}
              </p>
              <p className="text-[10px] text-zinc-500 truncate">{m.user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {isOwner ? (
                <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-400 border border-amber-800 bg-amber-950/20 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  OWNER
                </span>
              ) : canManage ? (
                <form action={updateMemberRole}>
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="userId" value={m.userId} />
                  <select
                    name="role"
                    defaultValue={m.role}
                    onChange={(e) => e.target.form?.requestSubmit()}
                    className="bg-zinc-900 border-2 border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-200 px-2 py-1 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </form>
              ) : (
                <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  m.role === "ADMIN"
                    ? "text-purple-400 border border-purple-800 bg-purple-950/20"
                    : m.role === "MEMBER"
                      ? "text-cyan-400 border border-cyan-800 bg-cyan-950/20"
                      : "text-zinc-400 border border-zinc-700 bg-zinc-900"
                }`}>
                  {m.role}
                </span>
              )}
              {canManage && !isSelf && (
                <form action={removeMember}>
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="userId" value={m.userId} />
                  <button
                    type="submit"
                    className="p-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
