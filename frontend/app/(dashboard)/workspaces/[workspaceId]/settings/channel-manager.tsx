"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, Plus, Send, Trash2 } from "lucide-react";
import { createChannel, deleteChannel, testChannel, toggleChannel } from "./actions";

export interface ChannelData {
  id: number;
  name: string;
  type: "EMAIL" | "SLACK" | "DISCORD" | "PAGERDUTY" | "WEBHOOK";
  events: string[];
  isActive: boolean;
  config: Record<string, unknown>;
  failureCount: number;
  disabledUntil: string | null;
  lastDeliveredAt: string | null;
}

const CHANNEL_TYPES = [
  { value: "EMAIL", label: "Email" },
  { value: "SLACK", label: "Slack" },
  { value: "DISCORD", label: "Discord" },
  { value: "PAGERDUTY", label: "PagerDuty" },
  { value: "WEBHOOK", label: "Webhook" },
] as const;

const EVENTS = [
  { value: "incident.opened", label: "Opened" },
  { value: "incident.acknowledged", label: "Acknowledged" },
  { value: "incident.resolved", label: "Resolved" },
  { value: "incident.reminder", label: "Reminder" },
] as const;

// The one field each type needs, and how to explain it.
const CONFIG_FIELD: Record<
  ChannelData["type"],
  { name: string; label: string; placeholder: string; hint: string; type?: string }
> = {
  EMAIL: {
    name: "to",
    label: "Recipients",
    placeholder: "oncall@example.com, sre@example.com",
    hint: "Comma-separated. Requires SMTP_HOST / SMTP_USER / SMTP_PASS on the API.",
  },
  SLACK: {
    name: "webhookUrl",
    label: "Incoming webhook URL",
    placeholder: "https://hooks.slack.com/services/...",
    hint: "Slack → Apps → Incoming Webhooks → Add to workspace.",
  },
  DISCORD: {
    name: "webhookUrl",
    label: "Webhook URL",
    placeholder: "https://discord.com/api/webhooks/...",
    hint: "Channel → Edit Channel → Integrations → Webhooks.",
  },
  PAGERDUTY: {
    name: "routingKey",
    label: "Integration key",
    placeholder: "R0ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    hint: "Service → Integrations → Events API v2. Resolves automatically on recovery.",
  },
  WEBHOOK: {
    name: "url",
    label: "Endpoint URL",
    placeholder: "https://example.com/hooks/pulseops",
    hint: "Receives the PulseOps JSON payload, signed with X-PulseOps-Signature.",
  },
};

export default function ChannelManager({
  workspaceId,
  channels,
  canEdit = false,
}: {
  workspaceId: string;
  channels: ChannelData[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [type, setType] = useState<ChannelData["type"]>("EMAIL");
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const field = CONFIG_FIELD[type];

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("workspaceId", workspaceId);

    const result = await createChannel(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setIsCreating(false);
      setType("EMAIL");
      router.refresh();
    }
    setPending(false);
  }

  async function run(
    channelId: number,
    action: (fd: FormData) => Promise<{ error?: string } | undefined>,
    extra?: Record<string, string>,
  ) {
    setBusyId(channelId);
    const formData = new FormData();
    formData.set("workspaceId", workspaceId);
    formData.set("channelId", String(channelId));
    for (const [k, v] of Object.entries(extra ?? {})) formData.set(k, v);
    await action(formData);
    router.refresh();
    setBusyId(null);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
            <Bell className="h-4 w-4" /> Alert channels
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Where incident alerts are delivered. Add as many as you need.
          </p>
        </div>
        {canEdit && !isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="btn btn-ghost shrink-0 gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add channel
          </button>
        )}
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="mt-5 space-y-4 rounded-lg border border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ch-name" className="block text-sm font-medium text-foreground">
                Name
              </label>
              <input
                id="ch-name"
                name="name"
                required
                maxLength={80}
                placeholder="On-call Slack"
                className="field mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="ch-type" className="block text-sm font-medium text-foreground">
                Type
              </label>
              <select
                id="ch-type"
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value as ChannelData["type"])}
                className="field mt-1.5"
              >
                {CHANNEL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="ch-config" className="block text-sm font-medium text-foreground">
              {field.label}
            </label>
            <input
              id="ch-config"
              name={field.name}
              required
              placeholder={field.placeholder}
              className="field mt-1.5 font-mono"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">{field.hint}</p>
          </div>

          {type === "WEBHOOK" && (
            <div>
              <label htmlFor="ch-secret" className="block text-sm font-medium text-foreground">
                Signing secret <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="ch-secret"
                name="secret"
                className="field mt-1.5 font-mono"
              />
            </div>
          )}

          <fieldset>
            <legend className="text-sm font-medium text-foreground">Events</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {EVENTS.map((ev) => (
                <label key={ev.value} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    name="events"
                    value={ev.value}
                    defaultChecked={ev.value === "incident.opened" || ev.value === "incident.resolved"}
                    className="h-3.5 w-3.5 accent-[var(--up)]"
                  />
                  {ev.label}
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="rounded-lg border border-down/40 bg-down/5 px-3 py-2 text-xs text-down">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="btn btn-primary text-xs"
            >
              {pending ? "Creating…" : "Create channel"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setError(null);
              }}
              className="btn btn-ghost text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-5">
        {channels.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No alert channels yet. Incidents will be recorded, but nobody will be notified.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {channels.map((channel) => {
              const benched =
                channel.disabledUntil && new Date(channel.disabledUntil) > new Date();

              return (
                <li key={channel.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{channel.name}</span>
                      <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {channel.type}
                      </span>
                      {!channel.isActive && (
                        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          paused
                        </span>
                      )}
                      {benched && (
                        <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-warn">
                          <AlertTriangle className="h-3 w-3" />
                          auto-paused after {channel.failureCount} failures
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      {channel.events.join(" · ")}
                      {channel.lastDeliveredAt && (
                        <span className="text-up">
                          {" "}
                          · last sent {new Date(channel.lastDeliveredAt).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>

                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => run(channel.id, testChannel)}
                        disabled={busyId === channel.id}
                        title="Send a test alert"
                        aria-label={`Send a test alert to ${channel.name}`}
                        className="icon-btn hover:border-up/40 hover:text-up disabled:opacity-40"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          run(channel.id, toggleChannel, { isActive: String(channel.isActive) })
                        }
                        disabled={busyId === channel.id}
                        className="btn btn-ghost px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider disabled:opacity-40"
                      >
                        {channel.isActive ? "Pause" : "Resume"}
                      </button>
                      <button
                        onClick={() => run(channel.id, deleteChannel)}
                        disabled={busyId === channel.id}
                        title="Delete channel"
                        aria-label={`Delete ${channel.name}`}
                        className="icon-btn hover:border-down/40 hover:text-down disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
