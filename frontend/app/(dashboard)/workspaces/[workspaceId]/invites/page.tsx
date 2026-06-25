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
    <main className="p-8 md:p-12 text-[#EEEAE0] min-h-screen">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <Link
            href={`/workspaces/${workspaceId}/monitors`}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 border border-[rgba(238,234,224,0.1)] text-label-md font-medium text-[#93A096] hover:text-[#A3D1DF] hover:border-[rgba(163,209,223,0.3)] transition-colors rounded-[999px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Command Center
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[rgba(238,234,224,0.06)] pb-6">
            <div>
              <h1 className="text-3xl font-medium text-[#EEEAE0] flex items-center gap-3">
                <UserPlus className="w-8 h-8 text-[#A3D1DF]" />
                Access <span className="text-[#A3D1DF]">Invites</span>
              </h1>
              <p className="text-body-md text-[#93A096] mt-2 font-medium">
                Provision secure entry tokens for new operators
              </p>
            </div>
            <div className="px-4 py-2 border border-[rgba(163,209,223,0.2)] text-label-md font-medium text-[#A3D1DF] rounded-[4px] flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {invites.active.length} Active
            </div>
          </div>
        </div>

        {/* Generate Invite Form */}
        <div className="glass rounded-[9px] p-[18px]">
          <h3 className="text-label-md font-medium text-[#93A096] mb-6 flex items-center gap-2 border-b border-[rgba(238,234,224,0.06)] pb-4">
            <TerminalSquare className="w-4 h-4 text-[#A3D1DF]" />
            Issue New Invite
          </h3>

          {error && (
            <div className="mb-4 p-3 bg-[rgba(194,118,107,0.1)] border border-[rgba(194,118,107,0.3)] rounded-[4px] text-[#C2766B] text-label-md font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5 space-y-2">
              <label className="block text-label-md font-medium text-[#93A096] flex items-center gap-1.5">
                <Mail className="w-3 h-3" />
                Operator Emails <span className="text-[#93A096]/60 font-normal">(one per line, comma or semicolon)</span>
              </label>
              <textarea
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                placeholder={"alice@pulseops.dev\nbob@acme.com, carol@example.com"}
                rows={3}
                className="w-full bg-[rgba(238,234,224,0.03)] border border-[rgba(238,234,224,0.15)] rounded-[9px] px-[12px] py-[10px] text-sm text-[#EEEAE0] placeholder:text-[#93A096]/40 focus-visible:border-[#A3D1DF] focus-visible:ring-2 focus-visible:ring-[rgba(163,209,223,0.2)] outline-none transition-colors resize-none"
              />
              {emailsText && (
                <p className="text-body-md text-[#93A096]/60">
                  {parseEmails(emailsText).length} recipient(s) detected
                </p>
              )}
            </div>

            <div className="md:col-span-3 space-y-2">
              <label className="block text-label-md font-medium text-[#93A096] flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                Role Assignment
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-[rgba(238,234,224,0.03)] border border-[rgba(238,234,224,0.15)] rounded-[9px] px-[12px] py-[10px] text-sm text-[#EEEAE0] focus-visible:border-[#A3D1DF] focus-visible:ring-2 focus-visible:ring-[rgba(163,209,223,0.2)] outline-none transition-colors appearance-none"
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
                className="w-full h-[52px] bg-[#A3D1DF] hover:bg-[#A3D1DF]/90 text-[#0A0F0C] rounded-[999px] border-0 transition-all text-label-md font-medium disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <UserPlus className="w-5 h-5" />
                {generating ? "Generating Secure Tokens..." : "Generate Invite Links"}
              </button>
            </div>
          </form>
        </div>

        {/* Generation Results */}
        {results && results.length > 0 && (
          <div className="glass rounded-[9px] p-[18px]">
            <h3 className="text-label-md font-medium text-[#93A096] mb-6 flex items-center gap-2 border-b border-[rgba(238,234,224,0.06)] pb-4">
              <CheckCircle2 className="w-4 h-4 text-[#9FD8BD]" />
              Delivery Results
            </h3>
            <div className="space-y-2">
              {results.map((r) => (
                <div
                  key={r.email}
                  className="flex items-center justify-between px-3 py-2 bg-[rgba(238,234,224,0.02)] border border-[rgba(238,234,224,0.06)] rounded-[4px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {r.sent ? (
                      <CheckCircle2 className="w-4 h-4 text-[#9FD8BD] shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#E2A356] shrink-0" />
                    )}
                    <span className="text-body-md text-[#EEEAE0] truncate">{r.email}</span>
                    <span className={`text-[10px] font-medium border rounded-[4px] px-1.5 py-0.5 ${
                      r.role === "ADMIN"
                        ? "text-[#A3D1DF] border-[rgba(163,209,223,0.3)]"
                        : r.role === "MEMBER"
                          ? "text-[#9FD8BD] border-[rgba(159,216,189,0.3)]"
                          : "text-[#93A096] border-[rgba(238,234,224,0.1)]"
                    }`}>
                      {r.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {r.sent ? (
                      <span className="text-label-md text-[#9FD8BD] font-medium">Delivered</span>
                    ) : (
                      <span className="text-label-md text-[#E2A356] font-medium">{r.error || "Failed"}</span>
                    )}
                    {r.token && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/invite/${r.token}`);
                        }}
                        className="p-1.5 border border-[rgba(238,234,224,0.1)] text-[#93A096] hover:text-[#A3D1DF] hover:border-[rgba(163,209,223,0.3)] rounded-[4px] transition-colors"
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
              className="mt-4 px-4 py-2 border border-[rgba(238,234,224,0.1)] text-label-md font-medium text-[#93A096] hover:text-[#EEEAE0] rounded-[999px] transition-colors"
            >
              Dismiss Results
            </button>
          </div>
        )}

        {/* Active Invites */}
        <div className="glass rounded-[9px] p-[18px]">
          <h3 className="text-label-md font-medium text-[#93A096] mb-6 flex items-center gap-2 border-b border-[rgba(238,234,224,0.06)] pb-4">
            <LinkIcon className="w-4 h-4 text-[#9FD8BD]" />
            Active Invites
            <span className="text-label-md text-[#93A096]/60 font-medium ml-auto">
              {loading ? "LOADING..." : `[${invites.active.length} Tokens]`}
            </span>
          </h3>

          {loading ? (
            <div className="p-8 text-center text-[#93A096]/60 text-label-md font-medium border border-dashed border-[rgba(238,234,224,0.1)] rounded-[9px]">
              Scanning active tokens...
            </div>
          ) : invites.active.length === 0 ? (
            <div className="p-8 text-center text-[#93A096]/60 text-label-md font-medium border border-dashed border-[rgba(238,234,224,0.1)] rounded-[9px]">
              No active invite tokens. Issue one above.
            </div>
          ) : (
            <div className="divide-y divide-[rgba(238,234,224,0.04)]">
              {invites.active.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between py-4 group hover:bg-[rgba(238,234,224,0.02)] transition-colors px-2 -mx-2">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-medium border rounded-[4px] px-2 py-0.5 ${
                        invite.role === "ADMIN"
                          ? "text-[#A3D1DF] border-[rgba(163,209,223,0.3)] bg-[rgba(163,209,223,0.05)]"
                          : invite.role === "MEMBER"
                            ? "text-[#9FD8BD] border-[rgba(159,216,189,0.3)] bg-[rgba(159,216,189,0.05)]"
                            : "text-[#93A096] border-[rgba(238,234,224,0.1)] bg-[rgba(238,234,224,0.03)]"
                      }`}>
                        {invite.role}
                      </span>
                      {invite.email && (
                        <span className="text-body-md text-[#93A096] flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-[#93A096]/60" />
                          {invite.email}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-body-md text-[#93A096]/60">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </span>
                      <span className="truncate max-w-xs">
                        /invite/{invite.token.slice(0, 16)}...
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                    <button
                      onClick={() => handleCopy(invite)}
                      className="p-2.5 border border-[rgba(238,234,224,0.1)] text-[#93A096] hover:text-[#9FD8BD] hover:border-[rgba(159,216,189,0.3)] rounded-[4px] transition-colors"
                      title="Copy Invite Link"
                    >
                      {copiedId === invite.id ? (
                        <Check className="w-4 h-4 text-[#9FD8BD]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={inviteLink(invite.token)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 border border-[rgba(238,234,224,0.1)] text-[#93A096] hover:text-[#A3D1DF] hover:border-[rgba(163,209,223,0.3)] rounded-[4px] transition-colors"
                      title="Open Invite Link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleRevoke(invite.id)}
                      className="p-2.5 border border-[rgba(238,234,224,0.1)] text-[#93A096] hover:text-[#C2766B] hover:border-[rgba(194,118,107,0.3)] rounded-[4px] transition-colors"
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
          <div className="glass rounded-[9px] p-[18px]">
            <details className="group">
              <summary className="text-label-md font-medium text-[#93A096]/60 cursor-pointer list-none flex items-center gap-2 hover:text-[#93A096] transition-colors">
                <X className="w-4 h-4 group-open:hidden" />
                <span className="group-open:hidden">Show Expired Tokens ({invites.expired.length})</span>
                <span className="hidden group-open:inline">Hide Expired Tokens</span>
              </summary>
              <div className="mt-4 divide-y divide-[rgba(238,234,224,0.04)]">
                {invites.expired.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between py-3 text-[#93A096]/60">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-medium border border-[rgba(238,234,224,0.06)] rounded-[4px] px-1.5 py-0.5">
                        {invite.role}
                      </span>
                      {invite.email && (
                        <span className="text-body-md text-[#93A096]/60">{invite.email}</span>
                      )}
                    </div>
                    <span className="text-body-md">
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
