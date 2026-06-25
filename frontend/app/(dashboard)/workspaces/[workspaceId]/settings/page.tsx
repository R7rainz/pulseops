import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import Link from "next/link";
import {
  ArrowLeft,
  Trash2,
  Key,
  Settings,
  ShieldAlert,
  TerminalSquare,
  Plus,
  UserPlus,
  Zap,
} from "lucide-react";
import { createApiKey, revokeApiKey, updateWorkspaceName } from "./actions";
import DeleteWorkspaceButton from "./delete-button";
import CreateApiKeyForm from "./create-apikey-form";

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
  try {
    const [wsRes, keysRes] = await Promise.all([
      apiFetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}`,
        { token, cookieStore, cache: "no-store" },
      ),
      apiFetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}/api-keys`,
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

    if (wsRes.status === 401 || wsRes.status === 403) {
      redirect("/login");
    }
  } catch (err) {
    console.error("Failed to load workspace settings:", err);
  }

  const isOwner = workspace?.role === "OWNER";
  const canEdit = workspace?.role === "OWNER" || workspace?.role === "ADMIN";

  return (
    <main className="p-8 md:p-12 text-[#EEEAE0] min-h-screen">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <Link
            href={`/workspaces/${workspaceId}/monitors`}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-transparent border border-[rgba(238,234,224,0.06)] text-xs font-medium text-[#93A096] hover:text-[#9FD8BD] hover:border-[#9FD8BD] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Grid
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[rgba(238,234,224,0.08)] pb-6">
            <div>
              <h1 className="text-3xl font-medium text-[#EEEAE0] flex items-center gap-3">
                <TerminalSquare className="w-8 h-8 text-[#9FD8BD]" />
                Workspace <span className="text-[#9FD8BD]">Config</span>
              </h1>
              <p className="text-sm text-[#93A096] mt-2">
                {workspace?.name ?? `Workspace #${workspaceId}`}
              </p>
            </div>
            <div className="px-4 py-2 bg-[rgba(159,216,189,0.1)] border border-[#9FD8BD]/50 text-xs font-medium text-[#9FD8BD]">
              {workspace?.role ?? "LOADING"} ACCESS
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="p-6 bg-transparent border border-[rgba(238,234,224,0.06)]">
          <h3 className="text-xs font-medium text-[#93A096] mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#93A096]" />
            General
          </h3>

          {workspace && (
            <form action={updateWorkspaceName} className="space-y-4">
              <input type="hidden" name="workspaceId" value={workspaceId} />

              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="block text-[10px] font-medium text-[#93A096]"
                >
                  Workspace Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={workspace.name}
                  required
                  disabled={!canEdit}
                  className="w-full bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.06)] px-4 py-3 text-[#EEEAE0] placeholder:text-[rgba(238,234,224,0.2)] focus:outline-none focus:border-[#9FD8BD] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {canEdit && (
                <button
                  type="submit"
                  className="bg-[#9FD8BD] hover:bg-[#9FD8BD] text-zinc-950 font-medium py-2 px-5 rounded-[999px] transition-all text-xs"
                >
                  Save Changes
                </button>
              )}
            </form>
          )}
        </div>

        {/* API Keys */}
        <div className="p-6 bg-transparent border border-[rgba(238,234,224,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-medium text-[#93A096] flex items-center gap-2">
              <Key className="w-4 h-4 text-[#93A096]" />
              API Keys
            </h3>
            <span className="text-[10px] text-[#93A096]">
              [{apiKeys.length} keys]
            </span>
          </div>

          {apiKeys.length > 0 ? (
            <div className="divide-y divide-[rgba(238,234,224,0.08)] mb-6">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#EEEAE0] truncate">
                      {key.name}
                    </p>
                    <p className="text-[10px] text-[#93A096] mt-0.5">
                      {key.isActive ? (
                        <>
                          Created {new Date(key.createdAt).toLocaleDateString()}
                          {key.lastUsedAt && (
                            <span className="ml-2 text-[#9FD8BD]">
                              &middot; Last used{" "}
                              {new Date(key.lastUsedAt).toLocaleDateString()}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[#C2766B]">Revoked</span>
                      )}
                    </p>
                  </div>

                  {key.isActive && canEdit && (
                    <form action={revokeApiKey}>
                      <input
                        type="hidden"
                        name="workspaceId"
                        value={workspaceId}
                      />
                      <input type="hidden" name="keyId" value={key.id} />
                      <button
                        type="submit"
                        className="p-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#C2766B] hover:border-[#C2766B]/40 transition-colors"
                        title="Revoke Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#93A096] text-xs font-medium mb-6 border border-dashed border-[rgba(238,234,224,0.06)] p-4 text-center">
              No API keys configured
            </p>
          )}

          {canEdit && <CreateApiKeyForm workspaceId={workspaceId} />}
        </div>

        {/* Invites */}
        {canEdit && (
          <Link
            href={`/workspaces/${workspaceId}/invites`}
            className="flex items-center justify-between p-6 bg-transparent border border-[rgba(238,234,224,0.06)] hover:border-[#A3D1DF]/40 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.06)] group-hover:border-[#A3D1DF]/40 transition-colors">
                <UserPlus className="w-5 h-5 text-[#A3D1DF]" />
              </div>
              <div>
                <h3 className="text-xs font-medium text-[#93A096]">
                  Access Invites
                </h3>
                <p className="text-[10px] text-[#93A096] mt-1">
                  Generate and manage secure invite tokens
                </p>
              </div>
            </div>
            <span className="text-[10px] text-[#A3D1DF] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Manage &rarr;
            </span>
          </Link>
        )}

        {/* Webhooks */}
        <Link
          href={`/workspaces/${workspaceId}/webhooks`}
          className="flex items-center justify-between p-6 bg-transparent border border-[rgba(238,234,224,0.06)] hover:border-[#A3D1DF]/40 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.06)] group-hover:border-[#A3D1DF]/40 transition-colors">
              <Zap className="w-5 h-5 text-[#A3D1DF]" />
            </div>
            <div>
              <h3 className="text-xs font-medium text-[#93A096]">
                Webhook Endpoints
              </h3>
              <p className="text-[10px] text-[#93A096] mt-1">
                Configure broadcast endpoints for incident alerts
              </p>
            </div>
          </div>
          <span className="text-[10px] text-[#A3D1DF] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Manage &rarr;
          </span>
        </Link>

        {/* Danger Zone */}
        {isOwner && (
          <div className="p-6 bg-transparent border border-[rgba(194,118,107,0.5)]">
            <h3 className="text-xs font-medium text-[#C2766B] mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Danger Zone
            </h3>

            <p className="text-xs text-[#93A096] mb-4">
              Deleting this workspace will permanently remove all monitors,
              checks, incidents, webhooks, and API keys. This action cannot be
              undone.
            </p>

            <DeleteWorkspaceButton workspaceId={workspaceId} />
          </div>
        )}
      </div>
    </main>
  );
}
