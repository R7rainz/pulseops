"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { MonitorCheck } from "@/lib/types";

interface Props {
  checks: MonitorCheck[];
}

const UP = "#9FD8BD";
const DOWN = "#F0584B";
const GRID = "rgba(238,234,224,0.08)";
const AXIS = "#93A096";

export default function ResponseTimeChart({ checks }: Props) {
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

  const avg = data.reduce((sum, d) => sum + d.responseTime, 0) / data.length;

  return (
    <div className="glass rounded-lg p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground">Response time</h3>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          avg {avg.toFixed(0)}ms · {checks.length} samples
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
                  <span key="name" style={{ color: p?.status === "UP" ? UP : DOWN }}>
                    {p?.status ?? "N/A"}
                    {p?.statusCode ? ` (HTTP ${p.statusCode})` : ""}
                  </span>,
                ];
              }}
            />
            <Line
              type="monotone"
              dataKey="responseTime"
              stroke="url(#rt-stroke)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: UP, stroke: "#0E1512", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
