"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Plus, Zap, FileText } from "lucide-react";
import { createWebhook, deleteWebhook } from "./actions";

interface WebhookData {
  id: number;
  url: string;
  isActive: boolean;
}

export default function WebhookManager({
  workspaceId,
  webhooks,
  canEdit = false,
}: {
  workspaceId: string;
  webhooks: WebhookData[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("workspaceId", workspaceId);

    const result = await createWebhook(formData);

    if (result?.error) {
      setError(result.error);
    } else {
      setIsCreating(false);
      router.refresh();
    }
    setPending(false);
  }

  async function handleDelete(webhookId: number) {
    const formData = new FormData();
    formData.set("workspaceId", workspaceId);
    formData.set("webhookId", webhookId.toString());

    const result = await deleteWebhook(formData);
    if (!result?.error) {
      router.refresh();
    }
  }

  return (
    <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.05)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-500" />
          Broadcast Endpoints
        </h3>
        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
          [{webhooks.length} Active]
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-950/50 border border-red-900 text-red-400 text-[10px] font-bold uppercase tracking-widest">
          {error}
        </div>
      )}

      {/* Webhook List */}
      {webhooks.length > 0 ? (
        <div className="divide-y-2 divide-zinc-900 mb-6 border-2 border-zinc-900 bg-zinc-950/50">
          {webhooks.map((hook) => (
            <div key={hook.id} className="flex items-center justify-between p-4 group hover:bg-zinc-900/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-zinc-200 truncate">
                  {hook.url}
                </p>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">
                  Status: <span className={hook.isActive ? "text-emerald-400" : "text-zinc-600"}>{hook.isActive ? "LIVE" : "DISABLED"}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/workspaces/${workspaceId}/webhooks/${hook.id}`}
                  className="p-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-cyan-400 hover:border-cyan-500 transition-colors"
                  title="Delivery Logs"
                >
                  <FileText className="w-4 h-4" />
                </Link>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(hook.id)}
                    className="p-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors"
                    title="Purge Endpoint"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-zinc-600 text-xs uppercase tracking-widest font-bold mb-6 border-2 border-dashed border-zinc-800 p-4 text-center">
          No external delivery endpoints configured.
        </p>
      )}

      {/* Creation Toggle */}
      {canEdit && !isCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold uppercase tracking-widest transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Target URL
        </button>
      ) : null}
      {canEdit && isCreating ? (
        <form onSubmit={handleCreate} className="space-y-4 border-2 border-emerald-900/30 bg-emerald-950/10 p-4">
          <div className="space-y-2">
            <label htmlFor="hook-url" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Destination URL
            </label>
            <input
              id="hook-url" name="url" type="url" placeholder="https://hooks.slack.com/services/..." required
              className="w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit" disabled={pending}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-widest text-xs border-2 border-transparent transition-all disabled:opacity-50"
            >
              {pending ? "Provisioning..." : "Provision Endpoint"}
            </button>
            <button
              type="button" onClick={() => setIsCreating(false)} disabled={pending}
              className="px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-400 hover:text-zinc-100 text-xs font-bold uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
