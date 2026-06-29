"use client";

import { useState, useEffect, useCallback } from "react";
import { API_URL } from "@/lib/constants";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  UserPlus,
  Copy,
  Check,
  Trash2,
  Mail,
  Shield,
  Clock,
  Link as LinkIcon,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const ROLE_CHIP: Record<string, string> = {
  ADMIN: "border-info/30 bg-info/10 text-info",
  MEMBER: "border-up/30 bg-up/10 text-up",
  VIEWER: "border-paused/30 bg-paused/10 text-paused",
};

interface InviteResult {
  email: string;
  token: string;
  link: string;
  role: string;
  sent: boolean;
  error?: string;
}

interface Invite {
  id: number;
  token: string;
  email: string | null;
  role: string;
  expiresAt: string;
  createdAt: string;
}

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

export default function InvitesPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [invites, setInvites] = useState<{ active: Invite[]; expired: Invite[] }>({ active: [], expired: [] });
  const [emailsText, setEmailsText] = useState("");
  const [selectedRole, setSelectedRole] = useState("VIEWER");
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setWorkspaceId(p.workspaceId));
  }, [params]);

  const fetchInvites = useCallback(async () => {
    const resolvedWsId = workspaceId || (await params).workspaceId;
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { token } = await tokenRes.json();
      if (!token) return;

      const res = await fetch(
        `${API_URL}/api/v1/workspaces/${resolvedWsId}/invites`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const json = await res.json();
        setInvites(json.data || { active: [], expired: [] });
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [workspaceId, params]);

  useEffect(() => {
    if (workspaceId) fetchInvites();
  }, [workspaceId, fetchInvites]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError(null);

    try {
      const tokenRes = await fetch("/api/auth/token");
      const { token } = await tokenRes.json();
      if (!token) return;

      const res = await fetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}/invites`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            role: selectedRole,
            emails: emailsText || undefined,
          }),
        },
      );

      const data = await res.json().catch(() => ({ message: "Failed to parse response", data: {} }));

      if (res.ok || res.status === 207) {
        setResults(data.data?.results || []);
        setEmailsText("");
        await fetchInvites();
        if (data.message) setError(null);
      } else {
        setError(data.message || "Failed to generate invites");
      }
    } catch {
      setError("Network error");
    }

    setGenerating(false);
  }

  async function handleRevoke(inviteId: number) {
    if (!window.confirm("Revoke this invite? The link will stop working.")) return;
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { token } = await tokenRes.json();
      if (!token) return;

      await fetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}/invites/${inviteId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      await fetchInvites();
    } catch {
      // silent
    }
  }

  function handleCopy(invite: Invite) {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${invite.token}`);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const inviteLink = (token: string) => `${window.location.origin}/invite/${token}`;

  return (
    <main className="min-h-dvh p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href={`/workspaces/${workspaceId}/monitors`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to monitors
        </Link>

        <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Invites</h1>
            <p className="mt-1 text-sm text-muted-foreground">Invite teammates to this workspace</p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-up/30 bg-up/10 px-3 py-1.5 text-xs font-medium text-up">
            <Shield className="h-3.5 w-3.5" /> {invites.active.length} active
          </span>
        </div>

        {/* Generate */}
        <div className="glass rounded-lg p-6">
          <h3 className="mb-4 flex items-center gap-2 border-b border-border pb-3 font-display text-sm font-semibold text-foreground">
            <UserPlus className="h-4 w-4 text-info" /> Issue an invite
          </h3>

          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">{error}</div>
          )}

          <form onSubmit={handleGenerate} className="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
            <div className="space-y-1.5 md:col-span-5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Mail className="h-3.5 w-3.5" /> Emails <span className="text-xs font-normal text-muted-foreground">(comma or new line)</span>
              </label>
              <textarea
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                placeholder={"alice@company.com\nbob@company.com"}
                rows={3}
                className="field resize-none font-mono text-sm"
              />
              {emailsText && <p className="text-xs text-muted-foreground">{parseEmails(emailsText).length} recipient(s)</p>}
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Shield className="h-3.5 w-3.5" /> Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="field cursor-pointer"
              >
                <option value="VIEWER">Viewer</option>
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <button type="submit" disabled={generating} className="btn btn-primary h-11 w-full">
                <UserPlus className="h-4 w-4" />
                {generating ? "Generating…" : "Generate invites"}
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        {results && results.length > 0 && (
          <div className="glass rounded-lg p-6">
            <h3 className="mb-4 flex items-center gap-2 border-b border-border pb-3 font-display text-sm font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-up" /> Results
            </h3>
            <div className="space-y-2">
              {results.map((r) => (
                <div key={r.email} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    {r.sent ? <CheckCircle2 className="h-4 w-4 shrink-0 text-up" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-degraded" />}
                    <span className="truncate text-sm text-foreground">{r.email}</span>
                    <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", ROLE_CHIP[r.role] ?? ROLE_CHIP.VIEWER)}>
                      {r.role.toLowerCase()}
                    </span>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-2">
                    <span className={cn("text-[11px] font-medium", r.sent ? "text-up" : "text-degraded")}>{r.sent ? "Sent" : r.error || "Failed"}</span>
                    {r.token && (
                      <button
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/invite/${r.token}`)}
                        className="icon-btn h-8 w-8 hover:border-info/40 hover:text-info"
                        title="Copy invite link"
                        aria-label="Copy invite link"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setResults(null)} className="btn btn-ghost mt-4">Dismiss</button>
          </div>
        )}

        {/* Active */}
        <div className="glass rounded-lg p-6">
          <h3 className="mb-4 flex items-center gap-2 border-b border-border pb-3 font-display text-sm font-semibold text-foreground">
            <LinkIcon className="h-4 w-4 text-up" /> Active invites
            <span className="ml-auto font-mono text-[11px] font-normal text-muted-foreground">
              {loading ? "…" : invites.active.length}
            </span>
          </h3>

          {loading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-raised" />)}
            </div>
          ) : invites.active.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No active invites — issue one above.</div>
          ) : (
            <div className="divide-y divide-border">
              {invites.active.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between gap-3 py-3.5">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", ROLE_CHIP[invite.role] ?? ROLE_CHIP.VIEWER)}>
                        {invite.role.toLowerCase()}
                      </span>
                      {invite.email && (
                        <span className="flex items-center gap-1.5 text-sm text-foreground/90">
                          <Mail className="h-3 w-3 text-muted-foreground" /> {invite.email}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Expires {new Date(invite.expiresAt).toLocaleDateString()}</span>
                      <span className="truncate">/invite/{invite.token.slice(0, 12)}…</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button onClick={() => handleCopy(invite)} className="icon-btn hover:border-up/40 hover:text-up" title="Copy invite link" aria-label="Copy invite link">
                      {copiedId === invite.id ? <Check className="h-4 w-4 text-up" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <a href={inviteLink(invite.token)} target="_blank" rel="noopener noreferrer" className="icon-btn hover:border-info/40 hover:text-info" title="Open invite link" aria-label="Open invite link">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button onClick={() => handleRevoke(invite.id)} className="icon-btn hover:border-down/40 hover:text-down" title="Revoke invite" aria-label="Revoke invite">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expired */}
        {invites.expired.length > 0 && (
          <details className="glass group rounded-lg p-6">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground">
              <span className="group-open:hidden">Show expired ({invites.expired.length})</span>
              <span className="hidden group-open:inline">Hide expired</span>
            </summary>
            <div className="mt-4 divide-y divide-border">
              {invites.expired.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between py-2.5 text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">{invite.role.toLowerCase()}</span>
                    {invite.email && <span className="text-xs">{invite.email}</span>}
                  </div>
                  <span className="font-mono text-[11px]">Expired {new Date(invite.expiresAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </main>
  );
}
