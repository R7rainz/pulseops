"use client";

import { useState, useEffect, useCallback } from "react";
import { API_URL } from "@/lib/constants";
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
  Send,
  Infinity as InfinityIcon,
  Users,
  RefreshCw,
} from "lucide-react";

const ROLE_CHIP: Record<string, string> = {
  ADMIN: "border-info/30 bg-info/10 text-info",
  MEMBER: "border-up/30 bg-up/10 text-up",
  VIEWER: "border-paused/30 bg-paused/10 text-paused",
};

const ROLE_HELP: Record<string, string> = {
  VIEWER: "Read-only access to monitors and incidents.",
  MEMBER: "Can create and manage monitors.",
  ADMIN: "Full access — manage monitors, members and settings.",
};

const EXPIRY_OPTIONS: { label: string; hours: number | null }[] = [
  { label: "1 hour", hours: 1 },
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 168 },
  { label: "30 days", hours: 720 },
  { label: "Never", hours: null },
];

const MAX_USES_OPTIONS: { label: string; value: number | null }[] = [
  { label: "No limit", value: null },
  { label: "1 use", value: 1 },
  { label: "5 uses", value: 5 },
  { label: "10 uses", value: 10 },
  { label: "25 uses", value: 25 },
  { label: "50 uses", value: 50 },
];

interface EmailResult {
  email: string;
  token: string;
  link: string;
  role: string;
  status: "sent" | "updated" | "already_member" | "failed";
  error?: string;
}

interface Invite {
  id: number;
  token: string;
  email: string | null;
  role: string;
  isLink: boolean;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  remainingUses: number | null;
  invitedByName: string | null;
  createdAt: string;
}

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

function expiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return "Never expires";
  const d = new Date(expiresAt);
  const now = Date.now();
  const diffMs = d.getTime() - now;
  if (diffMs <= 0) return "Expired";
  const hours = diffMs / 36e5;
  if (hours < 24) return `Expires in ${Math.max(1, Math.round(hours))}h`;
  return `Expires ${d.toLocaleDateString()}`;
}

async function authHeader(): Promise<Record<string, string> | null> {
  const res = await fetch("/api/auth/token");
  const { token } = await res.json();
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export default function InvitesPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [invites, setInvites] = useState<{ active: Invite[]; expired: Invite[] }>({ active: [], expired: [] });
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<"email" | "link">("email");
  const [emailsText, setEmailsText] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [expiryHours, setExpiryHours] = useState<number | null>(168);
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [emailResults, setEmailResults] = useState<EmailResult[] | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<number | null>(null);
  const [resentId, setResentId] = useState<number | null>(null);

  useEffect(() => {
    params.then((p) => setWorkspaceId(p.workspaceId));
  }, [params]);

  const fetchInvites = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/invites`, { headers });
      if (res.ok) {
        const json = await res.json();
        setInvites(json.data || { active: [], expired: [] });
      }
    } catch {
      /* silent */
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) fetchInvites();
  }, [workspaceId, fetchInvites]);

  function copy(key: string, text: string) {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
  }

  const linkFor = (token: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/invite/${token}` : `/invite/${token}`;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    setEmailResults(null);
    setCreatedLink(null);

    try {
      const headers = await authHeader();
      if (!headers) {
        setError("Your session expired. Please sign in again.");
        return;
      }

      const body: Record<string, unknown> = { role, expiresInHours: expiryHours };
      if (mode === "email") {
        if (parseEmails(emailsText).length === 0) {
          setError("Enter at least one email address.");
          return;
        }
        body.emails = emailsText;
      } else {
        body.maxUses = maxUses;
      }

      const res = await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/invites`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({ message: "Failed to parse response", data: {} }));

      if (res.ok || res.status === 207) {
        if (data.data?.mode === "link") {
          setCreatedLink(data.data.link);
        } else {
          setEmailResults(data.data?.results || []);
          setEmailsText("");
        }
        await fetchInvites();
      } else {
        setError(data.message || "Failed to create invite");
      }
    } catch {
      setError("Network error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(inviteId: number) {
    try {
      const headers = await authHeader();
      if (!headers) return;
      await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/invites/${inviteId}`, {
        method: "DELETE",
        headers,
      });
      setConfirmRevoke(null);
      await fetchInvites();
    } catch {
      /* silent */
    }
  }

  async function handleResend(inviteId: number) {
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}/invites/${inviteId}/resend`,
        { method: "POST", headers },
      );
      if (res.ok) {
        setResentId(inviteId);
        setTimeout(() => setResentId((id) => (id === inviteId ? null : id)), 2000);
      }
    } catch {
      /* silent */
    }
  }

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
            <p className="mt-1 text-sm text-muted-foreground">Invite teammates by email or share a join link</p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-up/30 bg-up/10 px-3 py-1.5 text-xs font-medium text-up">
            <Shield className="h-3.5 w-3.5" /> {invites.active.length} active
          </span>
        </div>

        {/* Issue */}
        <div className="glass rounded-lg p-6">
          {/* Mode toggle */}
          <div className="mb-5 inline-flex rounded-lg border border-border bg-surface-raised p-1">
            <button
              type="button"
              onClick={() => setMode("email")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                mode === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Mail className="h-3.5 w-3.5" /> Invite by email
            </button>
            <button
              type="button"
              onClick={() => setMode("link")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                mode === "link" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LinkIcon className="h-3.5 w-3.5" /> Shareable link
            </button>
          </div>

          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-4">
            {mode === "email" && (
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Mail className="h-3.5 w-3.5" /> Emails{" "}
                  <span className="text-xs font-normal text-muted-foreground">(comma or new line)</span>
                </label>
                <textarea
                  value={emailsText}
                  onChange={(e) => setEmailsText(e.target.value)}
                  placeholder={"alice@company.com\nbob@company.com"}
                  rows={3}
                  className="field resize-none font-mono text-sm"
                />
                {emailsText && (
                  <p className="text-xs text-muted-foreground">{parseEmails(emailsText).length} recipient(s)</p>
                )}
              </div>
            )}

            {mode === "link" && (
              <p className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-surface-raised/50 p-3 text-xs text-muted-foreground">
                <Users className="h-4 w-4 shrink-0 text-info" />
                Anyone with this link can join as <span className="font-medium text-foreground">{role.toLowerCase()}</span> until it expires{maxUses ? ` or reaches ${maxUses} use(s)` : ""}.
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Shield className="h-3.5 w-3.5" /> Role
                </label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="field cursor-pointer">
                  <option value="VIEWER">Viewer</option>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <p className="text-xs text-muted-foreground">{ROLE_HELP[role]}</p>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Clock className="h-3.5 w-3.5" /> Expires after
                </label>
                <select
                  value={expiryHours === null ? "never" : String(expiryHours)}
                  onChange={(e) => setExpiryHours(e.target.value === "never" ? null : Number(e.target.value))}
                  className="field cursor-pointer"
                >
                  {EXPIRY_OPTIONS.map((o) => (
                    <option key={o.label} value={o.hours === null ? "never" : String(o.hours)}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {mode === "link" && (
              <div className="space-y-1.5 sm:max-w-[50%]">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Users className="h-3.5 w-3.5" /> Max uses
                </label>
                <select
                  value={maxUses === null ? "none" : String(maxUses)}
                  onChange={(e) => setMaxUses(e.target.value === "none" ? null : Number(e.target.value))}
                  className="field cursor-pointer"
                >
                  {MAX_USES_OPTIONS.map((o) => (
                    <option key={o.label} value={o.value === null ? "none" : String(o.value)}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button type="submit" disabled={generating} className="btn btn-primary h-11 w-full sm:w-auto">
              {mode === "email" ? <Send className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
              {generating ? "Working…" : mode === "email" ? "Send invites" : "Create link"}
            </button>
          </form>

          {/* Freshly created link */}
          {createdLink && (
            <div className="mt-5 rounded-lg border border-up/30 bg-up/5 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-up">
                <CheckCircle2 className="h-4 w-4" /> Invite link ready — share it
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-background/60 px-3 py-2 font-mono text-xs text-foreground">
                  {createdLink}
                </code>
                <button onClick={() => copy("created", createdLink)} className="btn btn-primary shrink-0">
                  {copiedKey === "created" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedKey === "created" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Email results */}
          {emailResults && emailResults.length > 0 && (
            <div className="mt-5 space-y-2">
              {emailResults.map((r) => (
                <div key={r.email} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <ResultIcon status={r.status} />
                    <span className="truncate text-sm text-foreground">{r.email}</span>
                    <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", ROLE_CHIP[r.role] ?? ROLE_CHIP.VIEWER)}>
                      {r.role.toLowerCase()}
                    </span>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-2">
                    <span className={cn("text-[11px] font-medium", resultTone(r.status))}>{resultText(r)}</span>
                    {r.token && (
                      <button onClick={() => copy(r.email, linkFor(r.token))} className="icon-btn h-8 w-8 hover:border-info/40 hover:text-info" title="Copy invite link" aria-label="Copy invite link">
                        {copiedKey === r.email ? <Check className="h-3.5 w-3.5 text-up" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={() => setEmailResults(null)} className="btn btn-ghost mt-1">Dismiss</button>
            </div>
          )}
        </div>

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
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-raised" />)}
            </div>
          ) : invites.active.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No active invites — send one or create a link above.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {invites.active.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between gap-3 py-3.5">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", ROLE_CHIP[invite.role] ?? ROLE_CHIP.VIEWER)}>
                        {invite.role.toLowerCase()}
                      </span>
                      {invite.isLink ? (
                        <span className="flex items-center gap-1.5 text-sm text-foreground/90">
                          <LinkIcon className="h-3 w-3 text-info" /> Shareable link
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-foreground/90">
                          <Mail className="h-3 w-3 text-muted-foreground" /> {invite.email}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {expiryLabel(invite.expiresAt)}</span>
                      {invite.isLink && (
                        <span className="flex items-center gap-1">
                          {invite.maxUses === null ? <InfinityIcon className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                          {invite.useCount}
                          {invite.maxUses === null ? " joined" : ` / ${invite.maxUses} used`}
                        </span>
                      )}
                      <span className="truncate">/invite/{invite.token.slice(0, 12)}…</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {confirmRevoke === invite.id ? (
                      <>
                        <button onClick={() => handleRevoke(invite.id)} className="btn btn-danger h-8 px-3 text-xs">Revoke</button>
                        <button onClick={() => setConfirmRevoke(null)} className="btn btn-ghost h-8 px-3 text-xs">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => copy(`inv-${invite.id}`, linkFor(invite.token))} className="icon-btn hover:border-up/40 hover:text-up" title="Copy invite link" aria-label="Copy invite link">
                          {copiedKey === `inv-${invite.id}` ? <Check className="h-4 w-4 text-up" /> : <Copy className="h-4 w-4" />}
                        </button>
                        <a href={linkFor(invite.token)} target="_blank" rel="noopener noreferrer" className="icon-btn hover:border-info/40 hover:text-info" title="Open invite link" aria-label="Open invite link">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        {!invite.isLink && (
                          <button onClick={() => handleResend(invite.id)} className="icon-btn hover:border-info/40 hover:text-info" title="Resend email" aria-label="Resend email">
                            {resentId === invite.id ? <Check className="h-4 w-4 text-up" /> : <RefreshCw className="h-4 w-4" />}
                          </button>
                        )}
                        <button onClick={() => setConfirmRevoke(invite.id)} className="icon-btn hover:border-down/40 hover:text-down" title="Revoke invite" aria-label="Revoke invite">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expired / used up */}
        {invites.expired.length > 0 && (
          <details className="glass group rounded-lg p-6">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground">
              <span className="group-open:hidden">Show inactive ({invites.expired.length})</span>
              <span className="hidden group-open:inline">Hide inactive</span>
            </summary>
            <div className="mt-4 divide-y divide-border">
              {invites.expired.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between gap-3 py-2.5 text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">{invite.role.toLowerCase()}</span>
                    <span className="text-xs">{invite.isLink ? "Shareable link" : invite.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px]">
                      {invite.maxUses !== null && invite.useCount >= invite.maxUses ? "Max uses reached" : "Expired"}
                    </span>
                    <button onClick={() => handleRevoke(invite.id)} className="icon-btn h-7 w-7 hover:border-down/40 hover:text-down" title="Delete" aria-label="Delete invite">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </main>
  );
}

function ResultIcon({ status }: { status: EmailResult["status"] }) {
  if (status === "sent" || status === "updated") return <CheckCircle2 className="h-4 w-4 shrink-0 text-up" />;
  if (status === "already_member") return <Users className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <AlertTriangle className="h-4 w-4 shrink-0 text-degraded" />;
}

function resultTone(status: EmailResult["status"]): string {
  if (status === "sent" || status === "updated") return "text-up";
  if (status === "already_member") return "text-muted-foreground";
  return "text-degraded";
}

function resultText(r: EmailResult): string {
  switch (r.status) {
    case "sent": return "Sent";
    case "updated": return "Re-sent";
    case "already_member": return "Already a member";
    case "failed": return r.error ? "Link ready (email failed)" : "Failed";
  }
}
