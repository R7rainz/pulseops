// Events an alert channel can subscribe to.
export const NOTIFICATION_EVENTS = [
  "incident.opened",
  "incident.acknowledged",
  "incident.resolved",
  "incident.reminder",
] as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

// Transport-neutral description of what happened. Each adapter renders this
// into whatever shape its provider expects — previously every consumer got the
// same PulseOps-shaped JSON, which is why Slack/Discord webhooks couldn't be
// used at all.
export interface NotificationPayload {
  event: NotificationEvent;
  incidentId: number;
  monitorId: number;
  workspaceId: number;
  monitorName: string;
  monitorUrl: string;
  status: string;
  title: string;
  message: string;
  timestamp: string;
  // Set for resolve events so adapters can report how long the outage lasted.
  durationMs?: number | null;
}

export interface DeliveryResult {
  ok: boolean;
  status?: number | null;
  detail?: string | null;
}

// Thrown by adapter validate() when a channel's config is wrong. Distinct from
// a generic Error so the API can answer 400 with the adapter's own message
// ("must be a hooks.slack.com URL") instead of a bare 500.
export class ChannelConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChannelConfigError";
  }
}

export interface ChannelAdapter {
  /** Validates the channel's config, throwing ChannelConfigError if invalid. */
  validate(config: unknown): void;
  send(config: any, payload: NotificationPayload): Promise<DeliveryResult>;
}

// Shared presentation helpers so every adapter words things the same way.

export function severityOf(payload: NotificationPayload): "critical" | "warning" | "ok" {
  if (payload.event === "incident.resolved") return "ok";
  return payload.status === "DEGRADED" ? "warning" : "critical";
}

export function colorOf(payload: NotificationPayload): number {
  switch (severityOf(payload)) {
    case "ok":
      return 0x22c55e;
    case "warning":
      return 0xf59e0b;
    default:
      return 0xef4444;
  }
}

export function headlineOf(payload: NotificationPayload): string {
  switch (payload.event) {
    case "incident.resolved":
      return `Resolved: ${payload.monitorName}`;
    case "incident.acknowledged":
      return `Acknowledged: ${payload.monitorName}`;
    case "incident.reminder":
      return `Still down: ${payload.monitorName}`;
    default:
      return `${payload.status}: ${payload.monitorName}`;
  }
}

export function formatDuration(ms: number | null | undefined): string | null {
  if (ms == null || ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "under a minute";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours < 24) return `${hours}h ${rem}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
