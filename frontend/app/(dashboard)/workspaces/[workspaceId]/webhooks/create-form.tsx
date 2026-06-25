"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createWebhook } from "./actions";
import { WEBHOOK_EVENTS } from "./constants";

export function CreateWebhookForm({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([...WEBHOOK_EVENTS]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("workspaceId", workspaceId);
    for (const evt of selectedEvents) {
      formData.append("events", evt);
    }

    const result = await createWebhook(formData);

    if (result?.error) {
      setError(result.error);
    } else {
      setIsCreating(false);
      setSelectedEvents([...WEBHOOK_EVENTS]);
      router.refresh();
    }
    setPending(false);
  }

  function toggleEvent(evt: string) {
    setSelectedEvents((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt],
    );
  }

  if (!isCreating) {
    return (
      <button
        onClick={() => setIsCreating(true)}
        className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-[#9FD8BD] hover:bg-[rgba(159,216,189,0.1)] text-xs font-medium transition-colors"
      >
        <Plus className="w-4 h-4" /> Add Webhook Endpoint
      </button>
    );
  }

  return (
    <div className="border border-[#9FD8BD]/30 bg-[rgba(159,216,189,0.1)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-[#93A096] flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#9FD8BD]" />
          New Webhook Endpoint
        </h3>
        <button
          type="button"
          onClick={() => setIsCreating(false)}
          className="p-1 text-[#93A096] hover:text-[#EEEAE0] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-[rgba(194,118,107,0.1)] border border-[#C2766B] text-[#C2766B] text-[10px] font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-[10px] font-medium text-[#93A096]">
            Label (optional)
          </label>
          <input
            name="name"
            type="text"
            placeholder="e.g. Slack Alerts"
            className="w-full bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.06)] px-3 py-2 text-[#EEEAE0] placeholder:text-[rgba(238,234,224,0.2)] focus:outline-none focus:border-[#9FD8BD] transition-colors text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-medium text-[#93A096]">
            Destination URL
          </label>
          <input
            name="url"
            type="url"
            required
            placeholder="https://hooks.slack.com/services/..."
            className="w-full bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.06)] px-3 py-2 text-[#EEEAE0] placeholder:text-[rgba(238,234,224,0.2)] focus:outline-none focus:border-[#9FD8BD] transition-colors text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-medium text-[#93A096]">
            Trigger Events
          </label>
          <div className="flex flex-wrap gap-2">
            {WEBHOOK_EVENTS.map((evt) => (
              <button
                key={evt}
                type="button"
                onClick={() => toggleEvent(evt)}
                className={`text-[10px] font-medium px-2.5 py-1.5 border transition-colors ${
                  selectedEvents.includes(evt)
                    ? "bg-[rgba(159,216,189,0.1)] border-[#9FD8BD]/50 text-[#9FD8BD]"
                    : "bg-transparent border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#EEEAE0]"
                }`}
              >
                {evt}
              </button>
            ))}
          </div>
          {selectedEvents.length === 0 && (
            <p className="text-[10px] text-[#C2766B] font-medium">
              Select at least one event
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending || selectedEvents.length === 0}
            className="px-4 py-2 bg-[#9FD8BD] hover:bg-[#9FD8BD] text-zinc-950 font-medium text-xs rounded-[999px] transition-all disabled:opacity-50"
          >
            {pending ? "Provisioning..." : "Provision Endpoint"}
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            disabled={pending}
            className="px-4 py-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#EEEAE0] text-xs font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
