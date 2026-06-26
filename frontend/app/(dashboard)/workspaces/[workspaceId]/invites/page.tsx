"use client";

import { useState, useEffect, useCallback } from "react";
import { API_URL } from "@/lib/constants";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  UserPlus,
  Copy,
  Check,
  Trash2,
  Mail,
  Shield,
  Clock,
  TerminalSquare,
  Link as LinkIcon,
  X,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

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
    <main className="p-8 md:p-12 font-mono text-zinc-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <Link
            href={`/workspaces/${workspaceId}/monitors`}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-cyan-400 hover:border-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Command Center
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-zinc-900 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-widest uppercase text-zinc-100 flex items-center gap-3">
                <UserPlus className="w-8 h-8 text-cyan-400" />
                Access <span className="text-cyan-400">Invites</span>
              </h1>
              <p className="text-sm text-zinc-500 mt-2 uppercase tracking-widest font-bold">
                Provision secure entry tokens for new operators
              </p>
            </div>
            <div className="px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {invites.active.length} Active
            </div>
          </div>
        </div>

        {/* Generate Invite Form */}
        <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(34,211,238,0.05)]">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2 border-b-2 border-zinc-900 pb-4">
            <TerminalSquare className="w-4 h-4 text-cyan-400" />
            Issue New Invite
          </h3>

          {error && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-900 text-red-400 text-[10px] font-bold uppercase tracking-widest">
              {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5 space-y-2">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Mail className="w-3 h-3" />
                Operator Emails <span className="text-zinc-700 font-normal">(one per line, comma or semicolon)</span>
              </label>
              <textarea
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                placeholder={"alice@pulseops.dev\nbob@acme.com, carol@example.com"}
                rows={3}
                className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500 transition-colors text-sm font-mono resize-none"
              />
              {emailsText && (
                <p className="text-[10px] text-zinc-600">
                  {parseEmails(emailsText).length} recipient(s) detected
                </p>
              )}
            </div>

            <div className="md:col-span-3 space-y-2">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                Role Assignment
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-3 text-zinc-100 text-sm font-mono focus:outline-none focus:border-cyan-500 transition-colors appearance-none"
              >
                <option value="VIEWER">Viewer</option>
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <button
                type="submit"
                disabled={generating}
                className="w-full h-[52px] bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold uppercase tracking-widest border-2 border-transparent transition-all text-xs disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <UserPlus className="w-5 h-5" />
                {generating ? "Generating Secure Tokens..." : "Generate Invite Links"}
              </button>
            </div>
          </form>
        </div>

        {/* Generation Results */}
        {results && results.length > 0 && (
          <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.05)]">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2 border-b-2 border-zinc-900 pb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Delivery Results
            </h3>
            <div className="space-y-2">
              {results.map((r) => (
                <div
                  key={r.email}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 border border-zinc-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {r.sent ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className="text-sm text-zinc-300 truncate">{r.email}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest border px-1.5 py-0.5 ${
                      r.role === "ADMIN"
                        ? "text-purple-400 border-purple-800"
                        : r.role === "MEMBER"
                          ? "text-cyan-400 border-cyan-800"
                          : "text-zinc-400 border-zinc-700"
                    }`}>
                      {r.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {r.sent ? (
                      <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Delivered</span>
                    ) : (
                      <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">{r.error || "Failed"}</span>
                    )}
                    {r.token && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/invite/${r.token}`);
                        }}
                        className="p-1.5 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-cyan-400 hover:border-cyan-500 transition-colors"
                        title="Copy invite link"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setResults(null)}
              className="mt-4 px-4 py-2 bg-zinc-900 border-2 border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Dismiss Results
            </button>
          </div>
        )}

        {/* Active Invites */}
        <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.05)]">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2 border-b-2 border-zinc-900 pb-4">
            <LinkIcon className="w-4 h-4 text-emerald-400" />
            Active Invites
            <span className="text-[10px] text-zinc-600 font-bold ml-auto">
              {loading ? "LOADING..." : `[${invites.active.length} Tokens]`}
            </span>
          </h3>

          {loading ? (
            <div className="p-8 text-center text-zinc-600 text-xs uppercase tracking-widest font-bold border-2 border-dashed border-zinc-800">
              Scanning active tokens...
            </div>
          ) : invites.active.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 text-xs uppercase tracking-widest font-bold border-2 border-dashed border-zinc-800">
              No active invite tokens. Issue one above.
            </div>
          ) : (
            <div className="divide-y-2 divide-zinc-900">
              {invites.active.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between py-4 group hover:bg-zinc-900/30 transition-colors px-2 -mx-2">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 ${
                        invite.role === "ADMIN"
                          ? "text-purple-400 border-purple-800 bg-purple-950/20"
                          : invite.role === "MEMBER"
                            ? "text-cyan-400 border-cyan-800 bg-cyan-950/20"
                            : "text-zinc-400 border-zinc-700 bg-zinc-900"
                      }`}>
                        {invite.role}
                      </span>
                      {invite.email && (
                        <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-zinc-600" />
                          {invite.email}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-zinc-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </span>
                      <span className="font-mono truncate max-w-xs">
                        /invite/{invite.token.slice(0, 16)}...
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                    <button
                      onClick={() => handleCopy(invite)}
                      className="p-2.5 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-emerald-400 hover:border-emerald-500 transition-colors"
                      title="Copy Invite Link"
                    >
                      {copiedId === invite.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={inviteLink(invite.token)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-cyan-400 hover:border-cyan-500 transition-colors"
                      title="Open Invite Link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleRevoke(invite.id)}
                      className="p-2.5 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors"
                      title="Revoke Invite"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expired invites */}
        {invites.expired.length > 0 && (
          <div className="p-6 bg-zinc-950 border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
            <details className="group">
              <summary className="text-xs font-bold text-zinc-600 uppercase tracking-widest cursor-pointer list-none flex items-center gap-2 hover:text-zinc-400 transition-colors">
                <X className="w-4 h-4 group-open:hidden" />
                <span className="group-open:hidden">Show Expired Tokens ({invites.expired.length})</span>
                <span className="hidden group-open:inline">Hide Expired Tokens</span>
              </summary>
              <div className="mt-4 divide-y-2 divide-zinc-900">
                {invites.expired.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between py-3 text-zinc-600">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-bold uppercase tracking-widest border border-zinc-800 px-1.5 py-0.5">
                        {invite.role}
                      </span>
                      {invite.email && (
                        <span className="text-[10px] text-zinc-600">{invite.email}</span>
                      )}
                    </div>
                    <span className="text-[10px]">
                      Expired {new Date(invite.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

      </div>
    </main>
  );
}
