/**
 * Landing-page pricing + telemetry data (presentation layer only).
 *
 * The backend currently models two real plan tiers — FREE (capped at 5
 * monitors) and PRO (unlimited, "Telemetry Engine" enabled) — with the actual
 * billing amount configured in Razorpay, not in the repo. The tiers/amounts
 * below are the marketing presentation of those plans; the Enterprise tier is
 * a "contact us" lane. Amounts are USD placeholders — swap them for the real
 * Razorpay figures when wiring live checkout.
 */

export type Billing = "monthly" | "annual";

export interface Tier {
  id: "free" | "pro" | "enterprise";
  name: string;
  tagline: string;
  /** null = custom / contact-us pricing. Amount is the MONTHLY price in USD. */
  monthly: number | null;
  /** Perks shown on the card face. `hint` reveals extra detail on hover. */
  perks: { label: string; hint?: string }[];
  cta: { label: string; href: string };
  featured?: boolean;
}

export const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    tagline: "For side-projects and a first taste of PulseOps.",
    monthly: 0,
    perks: [
      { label: "Up to 5 monitors", hint: "HTTP, TLS and heartbeat checks — the hard cap is enforced by the API." },
      { label: "60-second checks", hint: "Every monitor is polled on its own interval down to one minute." },
      { label: "Incident timeline", hint: "Incidents open automatically on a threshold breach with acknowledge / resolve." },
      { label: "Webhook alerts + retries", hint: "Fire on status change with delivery logs and BullMQ-backed retries." },
      { label: "Public status page", hint: "Shareable page with a 90-day uptime heatmap." },
      { label: "Read-only API key", hint: "Programmatic read access to monitors, checks and incidents." },
    ],
    cta: { label: "Start free", href: "/signup" },
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For teams running production and on-call.",
    monthly: 19,
    perks: [
      { label: "Unlimited monitors", hint: "The 5-monitor cap is lifted the moment the workspace goes Pro." },
      { label: "Telemetry Engine", hint: "The real-time Kafka → Go → consumer pipeline that streams every check result." },
      { label: "SSL / TLS expiry monitoring", hint: "Certificate issuer + days-remaining tracking with early expiry warnings." },
      { label: "Read/write API + keys", hint: "Full programmatic control with scoped READ_WRITE keys." },
      { label: "Team members & RBAC", hint: "Owner / Admin / Member / Viewer roles with email invites." },
      { label: "Unlimited status pages & webhooks", hint: "No caps on endpoints or public pages." },
    ],
    cta: { label: "Upgrade to Pro", href: "/signup" },
    featured: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For platform teams with compliance needs.",
    monthly: null,
    perks: [
      { label: "Everything in Pro" },
      { label: "SSO / SAML", hint: "Directory-backed sign-in for your whole org." },
      { label: "Multi-region checks", hint: "Probe from US-East, EU-Central and AP-South (on the roadmap for Q3 2026)." },
      { label: "SLA & dedicated support", hint: "Contractual uptime targets and a named contact." },
      { label: "Priority telemetry throughput", hint: "Reserved Kafka capacity for high-volume workspaces." },
    ],
    cta: { label: "Talk to us", href: "mailto:sales@pulseops.dev?subject=PulseOps%20Enterprise" },
  },
];

/** Annual = 10× monthly (two months free). Returns the effective per-month price. */
export function perMonth(tier: Tier, billing: Billing): number | null {
  if (tier.monthly == null) return null;
  if (tier.monthly === 0) return 0;
  return billing === "annual" ? Math.round((tier.monthly * 10) / 12 * 100) / 100 : tier.monthly;
}

/** Total billed today for the chosen cycle (used in the fine print). */
export function billedTotal(tier: Tier, billing: Billing): number | null {
  if (tier.monthly == null || tier.monthly === 0) return tier.monthly;
  return billing === "annual" ? tier.monthly * 10 : tier.monthly;
}

/* ── Feature comparison matrix ──────────────────────────────────
   Grounded in the real product: monitor cap, Telemetry Engine and SSL
   gating are Pro; monitor count is the one API-enforced limit today. */
export type Cell = boolean | string;
export interface MatrixRow {
  feature: string;
  free: Cell;
  pro: Cell;
  enterprise: Cell;
}

export const MATRIX: { group: string; rows: MatrixRow[] }[] = [
  {
    group: "Monitoring",
    rows: [
      { feature: "Monitors", free: "5", pro: "Unlimited", enterprise: "Unlimited" },
      { feature: "Minimum check interval", free: "60s", pro: "60s", enterprise: "Custom" },
      { feature: "HTTP & heartbeat monitors", free: true, pro: true, enterprise: true },
      { feature: "SSL / TLS expiry monitoring", free: false, pro: true, enterprise: true },
      { feature: "Multi-region probes", free: false, pro: false, enterprise: "Roadmap" },
    ],
  },
  {
    group: "Incidents & alerts",
    rows: [
      { feature: "Incident timeline (open / ack / resolve)", free: true, pro: true, enterprise: true },
      { feature: "Webhook alerts + delivery logs + retries", free: true, pro: true, enterprise: true },
      { feature: "Public status pages (90-day heatmap)", free: "1", pro: "Unlimited", enterprise: "Unlimited" },
    ],
  },
  {
    group: "Telemetry & platform",
    rows: [
      { feature: "Telemetry Engine (real-time pipeline)", free: false, pro: true, enterprise: true },
      { feature: "Programmatic API", free: "Read-only", pro: "Read/write", enterprise: "Read/write" },
      { feature: "Team members & RBAC", free: true, pro: true, enterprise: true },
      { feature: "SSO / SAML", free: false, pro: false, enterprise: true },
      { feature: "SLA & dedicated support", free: false, pro: false, enterprise: true },
    ],
  },
];

/* ── Telemetry differentiation ──────────────────────────────────
   Factual, confident, not dismissive. Every PulseOps claim maps to real
   architecture: Kafka targets/metrics topics, the Go goroutine-pool ping
   engine, the in-process metrics consumer, and the Redis live cache. */

export const PIPELINE_STEPS: { label: string; sub: string }[] = [
  { label: "Scheduler", sub: "Due monitors dispatched to Kafka every 15s" },
  { label: "Go ping-engine", sub: "Goroutine worker pool probes endpoints concurrently" },
  { label: "Kafka metrics topic", sub: "Results streamed back as an event log" },
  { label: "Consumer + Redis", sub: "Applied in-process, cached live, persisted as last-seen" },
];

export interface TelemetryColumn {
  name: string;
  note: string;
  /** null = the PulseOps column (styled as the highlighted one). */
  self?: boolean;
}

export const TELEMETRY_COLUMNS: TelemetryColumn[] = [
  { name: "PulseOps", note: "Managed uptime + synthetic telemetry", self: true },
  { name: "OpenTelemetry", note: "Instrumentation spec + collector" },
  { name: "Datadog", note: "Full-suite APM SaaS" },
  { name: "Grafana + Prometheus", note: "Self-hosted metrics stack" },
];

export interface TelemetryRow {
  dimension: string;
  cells: string[]; // aligned with TELEMETRY_COLUMNS order
}

export const TELEMETRY_MATRIX: TelemetryRow[] = [
  {
    dimension: "Setup",
    cells: ["Paste a URL — no agents or SDKs", "Instrument code + run a collector", "Install an agent per host", "Deploy exporters + scrape config"],
  },
  {
    dimension: "Pipeline",
    cells: ["Built-in Kafka + Redis + Go workers", "Bring your own backend", "Proprietary hosted pipeline", "Self-managed TSDB + scraping"],
  },
  {
    dimension: "Processing",
    cells: ["Event-streamed, applied in real time", "Depends on your backend", "Real-time (hosted)", "Pull-based scrape interval"],
  },
  {
    dimension: "Ops overhead",
    cells: ["Fully managed", "You run the collector + storage", "Managed, per-host billing", "You run and scale the stack"],
  },
  {
    dimension: "Best for",
    cells: ["Uptime, SSL & synthetic checks", "Vendor-neutral tracing", "Deep application APM", "Custom infra metrics"],
  },
];

export const TELEMETRY_DIFFERENTIATORS: { title: string; body: string }[] = [
  {
    title: "Batteries-included pipeline",
    body: "The Kafka event bus, Redis live cache and Go worker pool ship inside PulseOps. There's no collector to deploy, no time-series database to size, and no exporter to babysit.",
  },
  {
    title: "Real-time by design",
    body: "Checks are dispatched to Kafka, probed concurrently by a Go goroutine pool, and streamed back to an in-process consumer — so status, latency and incidents update as results land, not on a scrape tick.",
  },
  {
    title: "Purpose-built, not a platform to assemble",
    body: "PulseOps focuses on uptime and synthetic telemetry rather than being a general observability toolkit. That narrower scope is why setup is a URL instead of an instrumentation project.",
  },
];
