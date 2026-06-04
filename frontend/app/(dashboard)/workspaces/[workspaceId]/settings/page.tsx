import { cookies } from "next/headers";
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
} from "lucide-react";
import { createApiKey, revokeApiKey, updateWorkspaceName } from "./actions";
import DeleteWorkspaceButton from "./delete-button";
import CreateApiKeyForm from "./create-apikey-form";
import WebhookManager from "./webhook-manager";

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
  let webhooks: { id: number; url: string; isActive: boolean }[] = [];

  try {
    const [wsRes, keysRes, hooksRes] = await Promise.all([
      apiFetch(
        `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}`,
        { token, cookieStore, cache: "no-store" },
      ),
      apiFetch(
        `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}/api-keys`,
        { token, cookieStore, cache: "no-store" },
      ),
      apiFetch(
        `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}/webhooks`,
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
    if (hooksRes.ok) {
      const hooksData = await hooksRes.json();
      webhooks = hooksData.data || [];
    }

    if (wsRes.status === 401 || wsRes.status === 403) {
      redirect("/login");
    }
  } catch (err) {
    console.error("Failed to load workspace settings:", err);
  }

  const isOwner = workspace?.role === "OWNER";

  return (
    <main className="p-8 md:p-12 font-mono text-zinc-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <Link
            href={`/workspaces/${workspaceId}/monitors`}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-400 hover:border-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Grid
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-zinc-900 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-widest uppercase text-zinc-100 flex items-center gap-3">
                <TerminalSquare className="w-8 h-8 text-emerald-400" />
                Workspace <span className="text-emerald-400">Config</span>
              </h1>
              <p className="text-sm text-zinc-500 mt-2 uppercase tracking-widest font-bold">
                {workspace?.name ?? `Workspace #${workspaceId}`}
              </p>
            </div>
            <div className="px-4 py-2 bg-emerald-500/10 border-2 border-emerald-500/50 text-xs font-bold text-emerald-400 uppercase tracking-widest">
              {workspace?.role ?? "LOADING"} ACCESS
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.05)]">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-500" />
            General
          </h3>

          {workspace && (
            <form action={updateWorkspaceName} className="space-y-4">
              <input type="hidden" name="workspaceId" value={workspaceId} />

              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest"
                >
                  Workspace Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={workspace.name}
                  required
                  disabled={!isOwner}
                  className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {isOwner && (
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-widest py-2 px-5 border-2 border-transparent transition-all text-xs"
                >
                  Save Changes
                </button>
              )}
            </form>
          )}
        </div>

        {/* API Keys */}
        <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Key className="w-4 h-4 text-zinc-500" />
              API Keys
            </h3>
            <span className="text-[10px] text-zinc-600">
              [{apiKeys.length} keys]
            </span>
          </div>

          {apiKeys.length > 0 ? (
            <div className="divide-y-2 divide-zinc-900 mb-6">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-200 uppercase tracking-wider truncate">
                      {key.name}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {key.isActive ? (
                        <>
                          Created {new Date(key.createdAt).toLocaleDateString()}
                          {key.lastUsedAt && (
                            <span className="ml-2 text-emerald-400">
                              &middot; Last used{" "}
                              {new Date(key.lastUsedAt).toLocaleDateString()}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-red-400">Revoked</span>
                      )}
                    </p>
                  </div>

                  {key.isActive && isOwner && (
                    <form action={revokeApiKey}>
                      <input
                        type="hidden"
                        name="workspaceId"
                        value={workspaceId}
                      />
                      <input type="hidden" name="keyId" value={key.id} />
                      <button
                        type="submit"
                        className="p-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors"
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
            <p className="text-zinc-600 text-xs uppercase tracking-widest font-bold mb-6 border-2 border-dashed border-zinc-800 p-4 text-center">
              No API keys configured
            </p>
          )}

          {isOwner && <CreateApiKeyForm workspaceId={workspaceId} />}
        </div>

        {/* Webhooks */}
        <WebhookManager workspaceId={workspaceId} webhooks={webhooks} />

        {/* Danger Zone */}
        {isOwner && (
          <div className="p-6 bg-zinc-950 border-2 border-red-900/50 shadow-[4px_4px_0px_0px_rgba(248,113,113,0.05)]">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Danger Zone
            </h3>

            <p className="text-xs text-zinc-500 mb-4">
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
