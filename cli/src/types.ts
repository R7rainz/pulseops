/**
 * Response models for the PulseOps read API.
 *
 * The OpenAPI spec documents request paths, params and query strings but does
 * not (yet) carry response schemas, so these interfaces are hand-authored to
 * mirror the backend's Prisma models and controller return shapes. Regenerate
 * the request-side types from the live spec with `pnpm gen` (writes
 * src/generated/schema.d.ts); keep this file in sync when the models change.
 *
 * Dates cross the wire as ISO-8601 strings.
 */

export interface SessionUser {
  id: number;
  name: string | null;
  email: string;
  createdAt?: string;
}

/** A workspace the signed-in user belongs to (from GET /workspaces). */
export interface Workspace {
  id: number;
  name: string;
  role?: string;
}

export type MonitorStatus = "UP" | "DOWN" | "DEGRADED" | "PAUSED";
export type MonitorType = "HTTP" | "HEARTBEAT";
export type IncidentStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

/** Standard success envelope: `{ message?, data, meta? }`. */
export interface Envelope<T> {
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
}

export interface Monitor {
  id: number;
  workspaceId: number;
  name: string;
  type: MonitorType;
  url: string;
  method: string;
  intervalSeconds: number;
  timeoutMs: number;
  expectedStatus: number;
  gracePeriodSeconds: number;
  status: MonitorStatus;
  consecutiveFailures: number;
  graceThreshold: number;
  isActive: boolean;
  lastCheckedAt: string | null;
  lastResponseTime: number | null;
  lastStatusCode: number | null;
  lastHeartbeatAt: string | null;
  tlsIssuer: string | null;
  tlsValidTo: string | null;
  tlsDaysRemaining: number | null;
  createdAt: string;
  updatedAt: string;
  maintenanceStartAt: string | null;
  maintenanceEndAt: string | null;
}

/** Latest cached telemetry for a monitor, read from the live Redis cache. */
export interface LiveState {
  status?: MonitorStatus;
  /** Latency in ms, as stored in the live cache. */
  latency?: number;
  statusCode?: number;
  /** ISO timestamp of the cached check. */
  lastChecked?: string;
  [key: string]: unknown;
}

/** `GET /monitors/live` → data keyed by monitor id. */
export type LiveMonitors = Record<string, LiveState>;

export interface MonitorCheck {
  id: number;
  monitorId: number;
  status: MonitorStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
  checkedAt: string;
}

export interface ChecksMeta {
  total: number;
  limit: number;
  offset: number;
}

/** One window of computed stats (all-time, or the 24h / 30d slices). */
export interface StatsWindow {
  totalChecks: number;
  upChecks: number;
  downChecks: number;
  degradedChecks: number;
  uptimePercentage: number;
  averageResponseTimeMs: number;
  p50ResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
}

export interface MonitorStats extends StatsWindow {
  latestStatus: MonitorStatus;
  range24h: StatsWindow;
  range30d: StatsWindow;
}

export interface MonitorAnalytics {
  uptime30Day: number;
  totalOutages30Day: number;
  downtimeMinutes30Day: number;
  avgLatency24h: number;
}

export interface Incident {
  id: number;
  monitorId: number;
  status: IncidentStatus;
  title: string;
  startedAt: string;
  resolvedAt: string | null;
}

/** `GET /incidents/:id` embeds the parent monitor. */
export interface IncidentWithMonitor extends Incident {
  monitor?: Monitor;
}

/** Body for `POST /workspaces/:id/monitors`. Server applies defaults for omitted fields. */
export interface CreateMonitorInput {
  name: string;
  type?: MonitorType;
  /** Required for HTTP monitors; omitted for HEARTBEAT. */
  url?: string;
  method?: string;
  intervalSeconds?: number;
  timeoutMs?: number;
  expectedStatus?: number;
  gracePeriodSeconds?: number;
}

/** Body for `PATCH /workspaces/:id/monitors/:id` — any subset of the create fields, plus active toggle. */
export type UpdateMonitorInput = Partial<CreateMonitorInput> & {
  isActive?: boolean;
};

/** The incident events a webhook can subscribe to. */
export const WEBHOOK_EVENTS = ["incident.opened", "incident.resolved"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** A workspace webhook endpoint (notification channel). */
export interface Webhook {
  id: number;
  workspaceId: number;
  name: string;
  url: string;
  /** Subscribed events (the API parses the stored JSON to an array). */
  events: string[];
  isActive: boolean;
  lastTestedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookInput {
  url: string;
  name?: string;
  events?: string[];
}

export type UpdateWebhookInput = {
  name?: string;
  url?: string;
  events?: string[];
  isActive?: boolean;
};
