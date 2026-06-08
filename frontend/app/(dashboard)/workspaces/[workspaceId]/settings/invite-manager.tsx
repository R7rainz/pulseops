"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Copy, Check, X, Trash2 } from "lucide-react";

interface Invite {
  id: number;
  token: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

interface InviteData {
  active: Invite[];
  expired: Invite[];
}

export default function InviteManager({
  workspaceId,
  initialData,
  canEdit,
}: {
  workspaceId: string;
  initialData: InviteData;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [invites, setInvites] = useState<InviteData>(initialData);
  const [generating, setGenerating] = useState(false);
  const [selectedRole, setSelectedRole] = useState("VIEWER");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);

    try {
      const tokenRes = await fetch("/api/auth/token");
      const { token } = await tokenRes.json();
      if (!token) return;

      const res = await fetch(
        `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}/invites`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: selectedRole }),
        },
      );

      if (res.ok) {
        router.refresh();
        const json = await res.json();
        setInvites((prev) => ({
          ...prev,
          active: [json.data, ...prev.active],
        }));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to generate invite");
      }
    } catch {
      setError("Network error");
    }

    setGenerating(false);
  }

  async function handleRevoke(inviteId: number) {
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { token } = await tokenRes.json();
      if (!token) return;

      await fetch(
        `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}/invites/${inviteId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setInvites((prev) => ({
        ...prev,
        active: prev.active.filter((i) => i.id !== inviteId),
        expired: [
          ...prev.expired,
          ...prev.active.filter((i) => i.id === inviteId),
        ],
      }));
      router.refresh();
    } catch {
      // ignore
    }
  }

  function handleCopy(token: string, id: number) {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (!canEdit) return null;

  return (
    <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.05)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-cyan-400" />
          Invite Links
        </h3>
        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
          [{invites.active.length} Active]
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-950/50 border border-red-900 text-red-400 text-[10px] font-bold uppercase tracking-widest">
          {error}
        </div>
      )}

      {/* Generate form */}
      <div className="flex items-end gap-3 mb-6 pb-6 border-b-2 border-zinc-900">
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Role
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-zinc-900 border-2 border-zinc-800 px-3 py-2.5 text-zinc-100 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="VIEWER">Viewer</option>
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold uppercase tracking-widest text-xs border-2 border-transparent transition-all disabled:opacity-50 flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          {generating ? "Generating..." : "Generate Link"}
        </button>
      </div>

      {/* Active invites */}
      {invites.active.length > 0 ? (
        <div className="divide-y-2 divide-zinc-900 mb-4">
          {invites.active.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between py-3 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border border-cyan-800 px-1.5 py-0.5">
                    {invite.role}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-600 mt-1 font-mono truncate">
                  {window.location.origin}/invite/{invite.token}
                </p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleCopy(invite.token, invite.id)}
                  className="p-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-cyan-400 hover:border-cyan-500 transition-colors"
                  title="Copy Invite Link"
                >
                  {copiedId === invite.id ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleRevoke(invite.id)}
                  className="p-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors"
                  title="Revoke Invite"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-zinc-600 text-xs uppercase tracking-widest font-bold mb-4 border-2 border-dashed border-zinc-800 p-4 text-center">
          No active invite links. Generate one above.
        </p>
      )}

      {/* Expired invites */}
      {invites.expired.length > 0 && (
        <details className="group mt-4 pt-4 border-t-2 border-zinc-900">
          <summary className="text-[10px] text-zinc-600 hover:text-zinc-400 uppercase tracking-widest font-bold cursor-pointer list-none flex items-center gap-2">
            <X className="w-3 h-3 group-open:hidden" />
            <span className="group-open:hidden">Show Expired ({invites.expired.length})</span>
            <span className="hidden group-open:inline">Hide Expired</span>
          </summary>
          <div className="mt-3 space-y-2">
            {invites.expired.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between py-2 text-zinc-600">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest border border-zinc-800 px-1 py-0.5">
                    {invite.role}
                  </span>
                  <span className="text-[10px]">Expired {new Date(invite.expiresAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
