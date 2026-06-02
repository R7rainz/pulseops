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

export default function ResponseTimeChart({ checks }: Props) {
  if (checks.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-600 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-zinc-800 bg-zinc-950">
        No data available
      </div>
    );
  }

  const data = [...checks]
    .reverse()
    .map((check) => ({
      time: new Date(check.checkedAt).toLocaleTimeString(),
      responseTime: check.responseTimeMs ?? 0,
      status: check.status,
      statusCode: check.statusCode,
    }));

  const avg =
    data.reduce((sum, d) => sum + d.responseTime, 0) / data.length;

  return (
    <div className="bg-zinc-950 border-2 border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
          Response Time History
        </h3>
        <span className="text-[10px] text-zinc-600 font-mono">
          avg {avg.toFixed(0)}ms &middot; {checks.length} samples
        </span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="time"
              tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }}
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }}
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
              unit="ms"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#09090b",
                border: "2px solid #27272a",
                borderRadius: 0,
                fontSize: 12,
                fontFamily: "monospace",
              }}
              labelStyle={{ color: "#a1a1aa" }}
              formatter={(value: unknown, _name: unknown, entry: { payload?: { status?: string; statusCode?: number | null } }) => {
                const v = typeof value === "number" ? value : 0;
                const p = entry?.payload;
                return [
                  <span key="val" className="text-zinc-100">{v}ms</span>,
                  <span key="name" className={p?.status === "UP" ? "text-emerald-400" : "text-red-400"}>
                    {p?.status ?? "N/A"}{p?.statusCode ? ` (HTTP ${p.statusCode})` : ""}
                  </span>,
                ];
              }}
            />
            <Line
              type="monotone"
              dataKey="responseTime"
              stroke="#34d399"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#34d399", stroke: "#09090b", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
