"use client";

import { useRouter } from "next/navigation";
import { Power, PowerOff, Play, Trash2 } from "lucide-react";
import { toggleWebhook, testWebhook, deleteWebhook } from "./actions";

export function WebhookActions({
  webhookId,
  workspaceId,
  isActive,
}: {
  webhookId: number;
  workspaceId: string;
  isActive: boolean;
}) {
  const router = useRouter();

  async function handleToggle() {
    const form = new FormData();
    form.set("workspaceId", workspaceId);
    form.set("webhookId", String(webhookId));
    const result = await toggleWebhook(form);
    if (!result?.error) router.refresh();
  }

  async function handleTest() {
    const form = new FormData();
    form.set("workspaceId", workspaceId);
    form.set("webhookId", String(webhookId));
    const result = await testWebhook(form);
    if (!result?.error) router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this webhook endpoint?")) return;
    const form = new FormData();
    form.set("workspaceId", workspaceId);
    form.set("webhookId", String(webhookId));
    const result = await deleteWebhook(form);
    if (!result?.error) router.refresh();
  }

  return (
    <>
      <button
        onClick={handleToggle}
        className={`p-2 border-2 transition-colors ${
          isActive
            ? "bg-zinc-950 border-zinc-800 text-emerald-500 hover:border-zinc-600"
            : "bg-zinc-950 border-zinc-800 text-zinc-600 hover:text-emerald-400 hover:border-emerald-500"
        }`}
        title={isActive ? "Disable" : "Enable"}
      >
        {isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
      </button>

      <button
        onClick={handleTest}
        className="p-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-amber-400 hover:border-amber-500 transition-colors"
        title="Send Test Ping"
      >
        <Play className="w-4 h-4" />
      </button>

      <button
        onClick={handleDelete}
        className="p-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors"
        title="Delete Webhook"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </>
  );
}
