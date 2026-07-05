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
