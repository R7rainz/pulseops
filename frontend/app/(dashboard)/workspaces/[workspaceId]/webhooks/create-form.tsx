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
        className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold uppercase tracking-widest transition-colors"
      >
        <Plus className="w-4 h-4" /> Add Webhook Endpoint
      </button>
    );
  }

  return (
    <div className="border-2 border-emerald-900/30 bg-emerald-950/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          New Webhook Endpoint
        </h3>
        <button
          type="button"
          onClick={() => setIsCreating(false)}
          className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-950/50 border border-red-900 text-red-400 text-[10px] font-bold uppercase tracking-widest">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Label (optional)
          </label>
          <input
            name="name"
            type="text"
            placeholder="e.g. Slack Alerts"
            className="w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Destination URL
          </label>
          <input
            name="url"
            type="url"
            required
            placeholder="https://hooks.slack.com/services/..."
            className="w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Trigger Events
          </label>
          <div className="flex flex-wrap gap-2">
            {WEBHOOK_EVENTS.map((evt) => (
              <button
                key={evt}
                type="button"
                onClick={() => toggleEvent(evt)}
                className={`text-[10px] font-bold px-2.5 py-1.5 border-2 uppercase tracking-widest transition-colors ${
                  selectedEvents.includes(evt)
                    ? "bg-emerald-950/20 border-emerald-500/50 text-emerald-400"
                    : "bg-zinc-950 border-zinc-800 text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {evt}
              </button>
            ))}
          </div>
          {selectedEvents.length === 0 && (
            <p className="text-[10px] text-red-400 font-bold">
              Select at least one event
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending || selectedEvents.length === 0}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-widest text-xs border-2 border-transparent transition-all disabled:opacity-50"
          >
            {pending ? "Provisioning..." : "Provision Endpoint"}
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            disabled={pending}
            className="px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-400 hover:text-zinc-100 text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
