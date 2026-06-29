import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import Link from "next/link";
import { ArrowLeft, Trash2, Key, Settings, ShieldAlert, UserPlus, Zap, ChevronRight } from "lucide-react";
import { revokeApiKey, updateWorkspaceName } from "./actions";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import DeleteWorkspaceButton from "./delete-button";
import CreateApiKeyForm from "./create-apikey-form";
import TeamMembers from "./team-members";

interface Workspace {
  id: number;
  name: string;
  slug: string;
  role: string;
  createdAt: string;
}

interface ApiKey {
  id: number;
  name: string;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Member {
  id: number;
  userId: number;
  role: string;
  createdAt: string;
  user: { id: number; name: string | null; email: string };
}

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) redirect("/login");

  let workspace: Workspace | null = null;
  let apiKeys: ApiKey[] = [];
  let members: Member[] = [];
  let currentUserId: number | null = null;
  try {
    const [wsRes, keysRes, membersRes, meRes] = await Promise.all([
      apiFetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}`,
        { token, cookieStore, cache: "no-store" },
      ),
      apiFetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}/api-keys`,
        { token, cookieStore, cache: "no-store" },
      ),
      apiFetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}/members`,
        { token, cookieStore, cache: "no-store" },
      ),
      apiFetch(
        `${API_URL}/api/v1/auth/me`,
        { token, cookieStore, cache: "no-store" },
      ),
    ]);

    if (wsRes.ok) {
      const wsData = await wsRes.json();
      workspace = wsData.data;
    }
    if (keysRes.ok) {
      const keysData = await keysRes.json();
      apiKeys = keysData.data || [];
    }
    if (membersRes.ok) {
      const membersData = await membersRes.json();
      members = membersData.data || [];
    }
    if (meRes.ok) {
      const meData = await meRes.json();
      currentUserId = meData.data?.id ?? null;
    }

    if (wsRes.status === 401 || wsRes.status === 403) {
      redirect("/login");
    }
  } catch (err) {
    console.error("Failed to load workspace settings:", err);
  }

  const isOwner = workspace?.role === "OWNER";
  const canEdit = workspace?.role === "OWNER" || workspace?.role === "ADMIN";

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
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">{workspace?.name ?? `Workspace #${workspaceId}`}</p>
          </div>
          <span className="self-start rounded-full border border-up/30 bg-up/10 px-3 py-1.5 text-xs font-medium text-up">
            {(workspace?.role ?? "—").toLowerCase()} access
          </span>
        </div>

        {/* General */}
        <section className="glass rounded-lg p-6">
          <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
            <Settings className="h-4 w-4 text-muted-foreground" /> General
          </h3>
          {workspace && (
            <form action={updateWorkspaceName} className="space-y-4">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-sm font-medium text-foreground">Workspace name</label>
                <input id="name" name="name" type="text" defaultValue={workspace.name} required disabled={!canEdit} className="field disabled:cursor-not-allowed disabled:opacity-50" />
              </div>
              {canEdit && <button type="submit" className="btn btn-primary">Save changes</button>}
            </form>
          )}
        </section>

        {/* API keys */}
        <section className="glass rounded-lg p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
              <Key className="h-4 w-4 text-muted-foreground" /> API keys
            </h3>
            <span className="font-mono text-[11px] text-muted-foreground">{apiKeys.length}</span>
          </div>

          {apiKeys.length > 0 ? (
            <div className="mb-5 divide-y divide-border">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{key.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {key.isActive ? (
                        <>
                          Created {new Date(key.createdAt).toLocaleDateString()}
                          {key.lastUsedAt && <span className="text-up"> · last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>}
                        </>
                      ) : (
                        <span className="text-down">Revoked</span>
                      )}
                    </p>
                  </div>
                  {key.isActive && canEdit && (
                    <form action={revokeApiKey}>
                      <input type="hidden" name="workspaceId" value={workspaceId} />
                      <input type="hidden" name="keyId" value={key.id} />
                      <ConfirmSubmit message={`Revoke API key “${key.name}”? Apps using it will stop working.`} className="icon-btn hover:border-down/40 hover:text-down" title="Revoke key" aria-label="Revoke key">
                        <Trash2 className="h-4 w-4" />
                      </ConfirmSubmit>
                    </form>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-5 rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No API keys yet.</p>
          )}

          {canEdit && <CreateApiKeyForm workspaceId={workspaceId} />}
        </section>

        {/* Team */}
        <section className="glass rounded-lg p-6">
          <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
            <UserPlus className="h-4 w-4 text-muted-foreground" /> Team members
          </h3>
          {members.length > 0 ? (
            <TeamMembers members={members} workspaceId={workspaceId} canEdit={canEdit} currentUserId={currentUserId} />
          ) : (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No members found.</p>
          )}
        </section>

        {/* Links */}
        {canEdit && <SettingsLink href={`/workspaces/${workspaceId}/invites`} icon={<UserPlus className="h-5 w-5 text-info" />} title="Invites" desc="Generate and manage invite links" />}
        <SettingsLink href={`/workspaces/${workspaceId}/webhooks`} icon={<Zap className="h-5 w-5 text-info" />} title="Webhooks" desc="Endpoints for incident alerts" />

        {/* Danger zone */}
        {isOwner && (
          <section className="rounded-lg border border-down/30 bg-down/[0.04] p-6">
            <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-down">
              <ShieldAlert className="h-4 w-4" /> Danger zone
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Deleting this workspace permanently removes all monitors, checks, incidents, webhooks, and API keys. This cannot be undone.
            </p>
            <DeleteWorkspaceButton workspaceId={workspaceId} />
          </section>
        )}
      </div>
    </main>
  );
}

function SettingsLink({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link href={href} className="glass group flex items-center justify-between rounded-lg p-5 transition-colors hover:border-up/25">
      <div className="flex items-center gap-4">
        <span className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-surface-raised">{icon}</span>
        <div>
          <h3 className="font-display text-sm font-medium text-foreground">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
