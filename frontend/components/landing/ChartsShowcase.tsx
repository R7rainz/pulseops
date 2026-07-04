"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useThemeColors, type ThemeColors } from "@/lib/useThemeColors";
import { useReducedMotion } from "@/components/three/useReducedMotion";
import {
  seedStream,
  tickStream,
  latencyDistribution,
  sparkGrid,
  seedLogs,
  nextLog,
  traceSpans,
  type StreamPoint,
  type LatencyBucket,
  type Spark,
  type LogLine,
  type Span,
} from "@/lib/mockTelemetry";

const TABS = [
  { id: "metrics", label: "Metrics" },
  { id: "logs", label: "Logs" },
  { id: "traces", label: "Traces" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const STREAM_LEN = 40;

function tooltipStyle(c: ThemeColors) {
  return {
    backgroundColor: c.card,
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    fontSize: 12,
    fontFamily: "var(--font-geist-mono)",
  } as const;
}

const levelClass: Record<LogLine["level"], string> = {
  INFO: "text-info",
  WARN: "text-degraded",
  ERROR: "text-down",
};

const spanClass: Record<Span["color"], string> = {
  signal: "bg-signal",
  up: "bg-up",
  degraded: "bg-degraded",
  muted: "bg-muted-foreground/50",
};

export default function ChartsShowcase() {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabId>("metrics");

  const [stream, setStream] = useState<StreamPoint[]>([]);
  const [dist, setDist] = useState<LatencyBucket[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [spans, setSpans] = useState<Span[]>([]);

  // Populate mock data on the client only (avoids SSR/hydration mismatch).
  useEffect(() => {
    setStream(seedStream(STREAM_LEN));
    setDist(latencyDistribution());
    setSparks(sparkGrid());
    setLogs(seedLogs(8));
    setSpans(traceSpans());
    setMounted(true);
  }, []);

  // Stream events/sec while the Metrics tab is live.
  useEffect(() => {
    if (!mounted || reduced || tab !== "metrics") return;
    const id = setInterval(() => setStream((p) => (p.length ? tickStream(p) : p)), 1200);
    return () => clearInterval(id);
  }, [mounted, reduced, tab]);

  // Append log lines while the Logs tab is live.
  useEffect(() => {
    if (!mounted || reduced || tab !== "logs") return;
    const id = setInterval(() => setLogs((p) => nextLog(p)), 1600);
    return () => clearInterval(id);
  }, [mounted, reduced, tab]);

  const live = mounted && !reduced;

  return (
    <div className="glass rounded-2xl p-5 sm:p-7">
      {/* header + tabs */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            {live && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-70" />
            )}
            <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {live ? "Live · streaming" : "Live telemetry"}
          </span>
        </div>
        <div
          role="tablist"
          aria-label="Telemetry view"
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/60 p-1"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors " +
                (tab === t.id
                  ? "bg-signal/15 text-signal"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!mounted ? (
        <Skeleton />
      ) : tab === "metrics" ? (
        <MetricsPanel c={c} stream={stream} dist={dist} sparks={sparks} />
      ) : tab === "logs" ? (
        <LogsPanel logs={logs} live={live} />
      ) : (
        <TracesPanel spans={spans} />
      )}
    </div>
  );
}

function MetricsPanel({
  c,
  stream,
  dist,
  sparks,
}: {
  c: ThemeColors;
  stream: StreamPoint[];
  dist: LatencyBucket[];
  sparks: Spark[];
}) {
  const latest = stream[stream.length - 1];
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-5">
        {/* streaming events/sec */}
        <ChartCard
          className="lg:col-span-3"
          title="Events / sec"
          value={latest ? latest.events.toLocaleString() : "—"}
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stream} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="cs-events" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.signal} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={c.signal} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
                <XAxis dataKey="i" hide />
                <YAxis
                  tick={{ fill: c.mutedForeground, fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={tooltipStyle(c)}
                  labelFormatter={() => "events/sec"}
                  formatter={(v: unknown) => [
                    <span key="v" style={{ color: c.foreground }}>
                      {typeof v === "number" ? v.toLocaleString() : String(v)}
                    </span>,
                    "",
                  ]}
                  cursor={{ stroke: c.border }}
                />
                <Area
                  type="monotone"
                  dataKey="events"
                  stroke={c.signal}
                  strokeWidth={2}
                  fill="url(#cs-events)"
                  isAnimationActive={false}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* latency distribution */}
        <ChartCard className="lg:col-span-2" title="Latency distribution" value="p95 78ms">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dist} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="cs-bars" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.signal} />
                    <stop offset="100%" stopColor={c.signalIndigo} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tick={{ fill: c.mutedForeground, fontSize: 9, fontFamily: "var(--font-geist-mono)" }}
                  tickLine={false}
                  axisLine={{ stroke: c.border }}
                  interval={0}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: `color-mix(in oklab, ${c.signal} 10%, transparent)` }}
                  contentStyle={tooltipStyle(c)}
                  labelStyle={{ color: c.mutedForeground }}
                  formatter={(v: unknown) => [
                    <span key="v" style={{ color: c.foreground }}>
                      {typeof v === "number" ? v.toLocaleString() : String(v)} req
                    </span>,
                    "ms bucket",
                  ]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {dist.map((_, i) => (
                    <Cell key={i} fill="url(#cs-bars)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* sparkline grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {sparks.map((s) => (
          <SparkTile key={s.name} spark={s} c={c} />
        ))}
      </div>
    </div>
  );
}

function SparkTile({ spark, c }: { spark: Spark; c: ThemeColors }) {
  const dotClass =
    spark.status === "UP" ? "bg-up" : spark.status === "DEGRADED" ? "bg-degraded" : "bg-down";
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-3">
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-mono text-[10px] text-muted-foreground">{spark.name}</span>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
      </div>
      <div className="mt-1 font-display text-sm font-semibold tabular-nums text-foreground">
        {spark.value}
      </div>
      <div className="mt-1.5 h-8">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={spark.series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`spk-${spark.name}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.signal} stopOpacity={0.4} />
                <stop offset="100%" stopColor={c.signal} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="y"
              stroke={c.signal}
              strokeWidth={1.5}
              fill={`url(#spk-${spark.name})`}
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LogsPanel({ logs, live }: { logs: LogLine[]; live: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-[color-mix(in_oklab,var(--surface)_70%,black)] p-4 font-mono text-[12px] leading-relaxed">
      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-signal" : "bg-muted-foreground"}`} />
        {live ? "tailing logs" : "recent logs"}
      </div>
      <div className="space-y-1">
        {logs.map((l) => (
          <div key={l.id} className="pop-in flex gap-3">
            <span className="shrink-0 text-muted-foreground">{l.time}</span>
            <span className={`shrink-0 font-semibold ${levelClass[l.level]}`}>{l.level}</span>
            <span className="shrink-0 text-accent-light">{l.service}</span>
            <span className="truncate text-muted-foreground">{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TracesPanel({ spans }: { spans: Span[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4">
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>trace · 8f2a…c19</span>
        <span>214ms total</span>
      </div>
      <div className="space-y-2">
        {spans.map((s) => (
          <div key={s.name} className="grid grid-cols-[minmax(9rem,1fr)_3fr] items-center gap-3">
            <span className="truncate font-mono text-[11px] text-foreground">{s.name}</span>
            <div className="relative h-5 rounded bg-border/40">
              <div
                className={`absolute top-0 flex h-5 items-center rounded px-1.5 ${spanClass[s.color]}`}
                style={{ left: `${s.start}%`, width: `${s.width}%` }}
              >
                <span className="truncate font-mono text-[10px] text-background/90">{s.ms}ms</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  value,
  className,
  children,
}: {
  title: string;
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface/40 p-4 ${className ?? ""}`}>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </h3>
        <span className="font-display text-lg font-semibold tabular-nums text-foreground">
          {value}
        </span>
      </div>
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="h-64 animate-pulse rounded-xl border border-border bg-surface/40 lg:col-span-3" />
      <div className="h-64 animate-pulse rounded-xl border border-border bg-surface/40 lg:col-span-2" />
    </div>
  );
}
