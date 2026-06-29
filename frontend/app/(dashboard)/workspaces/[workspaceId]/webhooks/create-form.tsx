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
      <button onClick={() => setIsCreating(true)} className="btn btn-accent">
        <Plus className="h-4 w-4" /> Add webhook
      </button>
    );
  }

  return (
    <div className="glass rounded-lg p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
          <Plus className="h-4 w-4 text-up" />
          New webhook
        </h3>
        <button type="button" onClick={() => setIsCreating(false)} className="icon-btn h-8 w-8" aria-label="Cancel">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Label (optional)</label>
          <input name="name" type="text" placeholder="e.g. Slack alerts" className="field" />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Destination URL</label>
          <input name="url" type="url" required placeholder="https://hooks.slack.com/services/…" className="field" />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Trigger events</label>
          <div className="flex flex-wrap gap-2">
            {WEBHOOK_EVENTS.map((evt) => {
              const on = selectedEvents.includes(evt);
              return (
                <button
                  key={evt}
                  type="button"
                  onClick={() => toggleEvent(evt)}
                  aria-pressed={on}
                  className={`rounded-full border px-3 py-1.5 font-mono text-[11px] transition-colors ${
                    on ? "border-up/40 bg-up/10 text-up" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {evt}
                </button>
              );
            })}
          </div>
          {selectedEvents.length === 0 && <p className="text-xs text-down">Select at least one event.</p>}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button type="submit" disabled={pending || selectedEvents.length === 0} className="btn btn-primary">
            {pending ? "Saving…" : "Create webhook"}
          </button>
          <button type="button" onClick={() => setIsCreating(false)} disabled={pending} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
