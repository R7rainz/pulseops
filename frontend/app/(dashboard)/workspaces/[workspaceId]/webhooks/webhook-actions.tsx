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
        className={`icon-btn ${isActive ? "text-up hover:border-up/40" : "hover:border-up/40 hover:text-up"}`}
        title={isActive ? "Disable" : "Enable"}
        aria-label={isActive ? "Disable webhook" : "Enable webhook"}
      >
        {isActive ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
      </button>

      <button onClick={handleTest} className="icon-btn hover:border-degraded/40 hover:text-degraded" title="Send test ping" aria-label="Send test ping">
        <Play className="h-4 w-4" />
      </button>

      <button onClick={handleDelete} className="icon-btn hover:border-down/40 hover:text-down" title="Delete webhook" aria-label="Delete webhook">
        <Trash2 className="h-4 w-4" />
      </button>
    </>
  );
}
