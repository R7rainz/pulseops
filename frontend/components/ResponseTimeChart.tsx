"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { MonitorCheck } from "@/lib/types";

interface Props {
  checks: MonitorCheck[];
  p95?: number;
}

const UP = "#9FD8BD";
const DOWN = "#F0584B";
const DEGRADED = "#F2C879";
const GRID = "rgba(238,234,224,0.08)";
const AXIS = "#93A096";

function dotColor(status: string) {
  return status === "UP" ? UP : status === "DEGRADED" ? DEGRADED : DOWN;
}

export default function ResponseTimeChart({ checks, p95 }: Props) {
  if (checks.length === 0) {
    return (
      <div className="glass flex h-full min-h-[18rem] items-center justify-center rounded-lg border-dashed text-sm text-muted-foreground">
        No response-time data yet
      </div>
    );
  }

  const data = [...checks].reverse().map((check) => ({
    time: new Date(check.checkedAt).toLocaleTimeString(),
    responseTime: check.responseTimeMs ?? 0,
    status: check.status,
    statusCode: check.statusCode,
  }));

  // Only healthy checks reflect real response performance — matches the
  // backend's averageResponseTimeMs, which excludes DOWN/DEGRADED latencies.
  const upSamples = data.filter((d) => d.status === "UP");
  const avg = upSamples.length === 0
    ? 0
    : upSamples.reduce((sum, d) => sum + d.responseTime, 0) / upSamples.length;

  return (
    <div className="glass rounded-lg p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground">Response time</h3>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          avg {avg.toFixed(0)}ms{p95 != null ? ` · p95 ${p95.toFixed(0)}ms` : ""} · {checks.length} samples
        </span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="rt-stroke" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={UP} stopOpacity={1} />
                <stop offset="100%" stopColor={UP} stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: AXIS, fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              interval="preserveStartEnd"
              minTickGap={32}
            />
            <YAxis
              tick={{ fill: AXIS, fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
              tickLine={false}
              axisLine={false}
              width={48}
              unit="ms"
            />
            <Tooltip
              cursor={{ stroke: GRID }}
              contentStyle={{
                backgroundColor: "#0E1512",
                border: "1px solid rgba(238,234,224,0.12)",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "var(--font-geist-mono)",
              }}
              labelStyle={{ color: "#93A096" }}
              formatter={(
                value: unknown,
                _name: unknown,
                entry: { payload?: { status?: string; statusCode?: number | null } },
              ) => {
                const v = typeof value === "number" ? value : 0;
                const p = entry?.payload;
                return [
                  <span key="val" style={{ color: "#EEEAE0" }}>{v}ms</span>,
                  <span key="name" style={{ color: p?.status ? dotColor(p.status) : DOWN }}>
                    {p?.status ?? "N/A"}
                    {p?.statusCode ? ` (HTTP ${p.statusCode})` : ""}
                  </span>,
                ];
              }}
            />
            {p95 != null && (
              <ReferenceLine
                y={p95}
                stroke={DEGRADED}
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{ value: "p95", position: "insideTopRight", fill: DEGRADED, fontSize: 10 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="responseTime"
              stroke="url(#rt-stroke)"
              strokeWidth={2}
              dot={(props: { cx?: number; cy?: number; payload?: { status: string }; key?: React.Key | null }) => {
                const { cx, cy, payload, key } = props;
                if (cx == null || cy == null || !payload) return <g key={key} />;
                return (
                  <circle
                    key={key}
                    cx={cx}
                    cy={cy}
                    r={payload.status === "UP" ? 2 : 3.5}
                    fill={dotColor(payload.status)}
                    stroke="#0E1512"
                    strokeWidth={payload.status === "UP" ? 0 : 1}
                  />
                );
              }}
              activeDot={{ r: 4, fill: UP, stroke: "#0E1512", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
