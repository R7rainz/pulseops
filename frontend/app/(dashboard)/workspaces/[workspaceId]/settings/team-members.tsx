"use client";

import { Crown } from "lucide-react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { removeMember, updateMemberRole } from "./members-actions";

interface Member {
  id: number;
  userId: number;
  role: string;
  createdAt: string;
  user: { id: number; name: string | null; email: string };
}

const ROLE_CHIP: Record<string, string> = {
  ADMIN: "border-info/30 bg-info/10 text-info",
  MEMBER: "border-up/30 bg-up/10 text-up",
  VIEWER: "border-paused/30 bg-paused/10 text-paused",
};

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
  const sorted = [...members].sort(
    (a, b) =>
      (rank[a.role] ?? 99) - (rank[b.role] ?? 99) ||
      (a.user.name || a.user.email).localeCompare(b.user.name || b.user.email),
  );

  return (
    <div className="divide-y divide-border">
      {sorted.map((m) => {
        const isSelf = m.userId === currentUserId;
        const isOwner = m.role === "OWNER";
        const canManage = canEdit && !isOwner;
        return (
          <div key={m.id} className="flex items-center gap-3 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-xs font-semibold uppercase text-muted-foreground">
              {(m.user.name || m.user.email)[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                {m.user.name || "Unnamed"}
                {isSelf && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
              </p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{m.user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {isOwner ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-degraded/30 bg-degraded/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-degraded">
                  <Crown className="h-3 w-3" /> owner
                </span>
              ) : canManage ? (
                <form action={updateMemberRole}>
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="userId" value={m.userId} />
                  <select
                    key={m.role + m.userId}
                    name="role"
                    defaultValue={m.role}
                    onChange={(e) => e.target.form?.requestSubmit()}
                    aria-label="Member role"
                    className="cursor-pointer rounded-lg border border-input bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-foreground focus:border-up/50 focus:outline-none"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </form>
              ) : (
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", ROLE_CHIP[m.role] ?? ROLE_CHIP.VIEWER)}>
                  {m.role.toLowerCase()}
                </span>
              )}
              {canManage && !isSelf && (
                <form action={removeMember}>
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="userId" value={m.userId} />
                  <ConfirmSubmit
                    message={`Remove ${m.user.name || m.user.email} from this workspace?`}
                    className="icon-btn h-8 w-8 hover:border-down/40 hover:text-down"
                    title="Remove member"
                    aria-label="Remove member"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </ConfirmSubmit>
                </form>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
