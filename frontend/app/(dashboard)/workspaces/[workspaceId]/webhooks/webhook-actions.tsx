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
        className={`p-2 border transition-colors ${
          isActive
            ? "bg-transparent border-[rgba(238,234,224,0.06)] text-[#9FD8BD] hover:border-[rgba(238,234,224,0.1)]"
            : "bg-transparent border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#9FD8BD] hover:border-[#9FD8BD]/40"
        }`}
        title={isActive ? "Disable" : "Enable"}
      >
        {isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
      </button>

      <button
        onClick={handleTest}
        className="p-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#E2A356] hover:border-[#E2A356]/40 transition-colors"
        title="Send Test Ping"
      >
        <Play className="w-4 h-4" />
      </button>

      <button
        onClick={handleDelete}
        className="p-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#C2766B] hover:border-[#C2766B]/40 transition-colors"
        title="Delete Webhook"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </>
  );
}
