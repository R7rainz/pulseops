// Mock telemetry generators for the landing "live" charts showcase.
// Deterministic-ish shapes with light randomness so the demo reads convincingly
// without any backend. No React here — pure data.

export interface StreamPoint {
  i: number;
  events: number;
  latency: number;
}

/** Seed a streaming series with `n` points ending "now". */
export function seedStream(n: number): StreamPoint[] {
  const out: StreamPoint[] = [];
  let events = 1800;
  let latency = 42;
  for (let i = 0; i < n; i++) {
    events = nextEvents(events);
    latency = nextLatency(latency);
    out.push({ i, events, latency });
  }
  return out;
}

function nextEvents(prev: number): number {
  const drift = (Math.random() - 0.5) * 260;
  const pull = (2000 - prev) * 0.08; // mean-revert around ~2k events/s
  return Math.max(600, Math.round(prev + drift + pull));
}

function nextLatency(prev: number): number {
  const drift = (Math.random() - 0.5) * 10;
  const pull = (44 - prev) * 0.12; // mean-revert around ~44ms
  const spike = Math.random() > 0.94 ? Math.random() * 40 : 0;
  return Math.max(8, Math.round(prev + drift + pull + spike));
}

/** Advance a stream by one tick (drops the oldest, appends a fresh point). */
export function tickStream(prev: StreamPoint[]): StreamPoint[] {
  const last = prev[prev.length - 1];
  const next: StreamPoint = {
    i: last.i + 1,
    events: nextEvents(last.events),
    latency: nextLatency(last.latency),
  };
  return [...prev.slice(1), next];
}

export interface LatencyBucket {
  bucket: string;
  count: number;
}

/** Latency distribution histogram (right-skewed, realistic). */
export function latencyDistribution(): LatencyBucket[] {
  const buckets = ["0–20", "20–40", "40–60", "60–80", "80–120", "120+"];
  const shape = [0.42, 1, 0.78, 0.34, 0.16, 0.06];
  return buckets.map((bucket, i) => ({
    bucket,
    count: Math.round(shape[i] * (900 + Math.random() * 120)),
  }));
}

export interface Spark {
  name: string;
  region: string;
  status: "UP" | "DEGRADED" | "DOWN";
  value: string;
  series: { x: number; y: number }[];
}

export function sparkGrid(): Spark[] {
  const defs: Omit<Spark, "series">[] = [
    { name: "api-gateway", region: "us-east", status: "UP", value: "38ms" },
    { name: "auth-service", region: "eu-central", status: "UP", value: "51ms" },
    { name: "checkout", region: "us-west", status: "DEGRADED", value: "182ms" },
    { name: "search", region: "ap-south", status: "UP", value: "64ms" },
    { name: "webhooks", region: "eu-west", status: "UP", value: "29ms" },
    { name: "media-cdn", region: "global", status: "UP", value: "12ms" },
  ];
  return defs.map((d) => {
    const base = 40 + Math.random() * 30;
    const series = Array.from({ length: 24 }, (_, x) => ({
      x,
      y: Math.max(5, base + Math.sin(x / 2) * 12 + (Math.random() - 0.5) * 18),
    }));
    return { ...d, series };
  });
}

export interface LogLine {
  id: number;
  time: string;
  level: "INFO" | "WARN" | "ERROR";
  service: string;
  msg: string;
}

const LOG_SAMPLES: Omit<LogLine, "id" | "time">[] = [
  { level: "INFO", service: "scheduler", msg: "dispatched 128 checks to ping-engine" },
  { level: "INFO", service: "ping-engine", msg: "probe api-gateway us-east → 200 in 38ms" },
  { level: "WARN", service: "ping-engine", msg: "probe checkout us-west → 200 in 182ms (slow)" },
  { level: "INFO", service: "tls", msg: "cert acme.example.com valid — 74d to expiry" },
  { level: "ERROR", service: "incidents", msg: "opened INC-4192 · payments down (3 consecutive)" },
  { level: "INFO", service: "webhooks", msg: "delivered status_change → slack (204)" },
  { level: "WARN", service: "consumer", msg: "metrics lag 1.2s on partition 2" },
  { level: "INFO", service: "alerts", msg: "acknowledged INC-4192 by on-call" },
];

export function seedLogs(n: number): LogLine[] {
  return Array.from({ length: n }, (_, i) => makeLog(i));
}

let logClock = 0;
function makeLog(id: number): LogLine {
  const s = LOG_SAMPLES[Math.floor(Math.random() * LOG_SAMPLES.length)];
  logClock += 1;
  const d = new Date(Date.now() - (200 - logClock) * 1000);
  return { id, time: d.toLocaleTimeString([], { hour12: false }), ...s };
}

export function nextLog(prev: LogLine[]): LogLine[] {
  const id = (prev[prev.length - 1]?.id ?? 0) + 1;
  return [...prev.slice(-7), makeLog(id)];
}

export interface Span {
  name: string;
  start: number; // % offset
  width: number; // % width
  color: "signal" | "up" | "degraded" | "muted";
  ms: number;
}

/** A single request trace as a span waterfall. */
export function traceSpans(): Span[] {
  return [
    { name: "GET /api/v1/checkout", start: 0, width: 100, color: "signal", ms: 214 },
    { name: "auth.verify", start: 4, width: 14, color: "up", ms: 30 },
    { name: "db.query orders", start: 20, width: 26, color: "muted", ms: 56 },
    { name: "payments.charge", start: 48, width: 38, color: "degraded", ms: 82 },
    { name: "cache.write", start: 87, width: 9, color: "up", ms: 19 },
    { name: "webhook.enqueue", start: 96, width: 4, color: "up", ms: 9 },
  ];
}
