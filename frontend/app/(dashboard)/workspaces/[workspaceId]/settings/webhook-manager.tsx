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
    <div className="p-6 bg-transparent border border-[rgba(238,234,224,0.06)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-medium text-[#93A096] flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#9FD8BD]" />
          Broadcast Endpoints
        </h3>
        <span className="text-[10px] text-[#93A096] font-medium">
          [{webhooks.length} Active]
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-[rgba(194,118,107,0.1)] border border-[#C2766B] text-[#C2766B] text-[10px] font-medium">
          {error}
        </div>
      )}

      {/* Webhook List */}
      {webhooks.length > 0 ? (
        <div className="divide-y divide-[rgba(238,234,224,0.08)] mb-6 border border-[rgba(238,234,224,0.08)] bg-transparent">
          {webhooks.map((hook) => (
            <div key={hook.id} className="flex items-center justify-between p-4 group hover:bg-[rgba(238,234,224,0.04)] transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#EEEAE0] truncate">
                  {hook.url}
                </p>
                <p className="text-[10px] text-[#93A096] mt-1">
                  Status: <span className={hook.isActive ? "text-[#9FD8BD]" : "text-[#93A096]"}>{hook.isActive ? "LIVE" : "DISABLED"}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/workspaces/${workspaceId}/webhooks/${hook.id}`}
                  className="p-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#A3D1DF] hover:border-[#A3D1DF]/40 transition-colors"
                  title="Delivery Logs"
                >
                  <FileText className="w-4 h-4" />
                </Link>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(hook.id)}
                    className="p-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#C2766B] hover:border-[#C2766B]/40 transition-colors"
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
        <p className="text-[#93A096] text-xs font-medium mb-6 border border-dashed border-[rgba(238,234,224,0.06)] p-4 text-center">
          No external delivery endpoints configured.
        </p>
      )}

      {/* Creation Toggle */}
      {canEdit && !isCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-[#9FD8BD] hover:bg-[rgba(159,216,189,0.1)] text-xs font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Target URL
        </button>
      ) : null}
      {canEdit && isCreating ? (
        <form onSubmit={handleCreate} className="space-y-4 border border-[#9FD8BD]/30 bg-[rgba(159,216,189,0.1)] p-4">
          <div className="space-y-2">
            <label htmlFor="hook-url" className="block text-[10px] font-medium text-[#93A096]">
              Destination URL
            </label>
            <input
              id="hook-url" name="url" type="url" placeholder="https://hooks.slack.com/services/..." required
              className="w-full bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.06)] px-3 py-2 text-[#EEEAE0] placeholder:text-[rgba(238,234,224,0.2)] focus:outline-none focus:border-[#9FD8BD] transition-colors text-sm"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit" disabled={pending}
              className="px-4 py-2 bg-[#9FD8BD] hover:bg-[#9FD8BD] text-zinc-950 font-medium text-xs rounded-[999px] transition-all disabled:opacity-50"
            >
              {pending ? "Provisioning..." : "Provision Endpoint"}
            </button>
            <button
              type="button" onClick={() => setIsCreating(false)} disabled={pending}
              className="px-4 py-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#EEEAE0] text-xs font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
