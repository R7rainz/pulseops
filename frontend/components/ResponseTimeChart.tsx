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
      <div className="flex items-center justify-center h-48 text-[#93A096]/60 text-body-md font-medium border border-dashed border-[rgba(238,234,224,0.1)] rounded-[9px] bg-[rgba(238,234,224,0.02)]">
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
    <div className="glass rounded-[9px] p-[12px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#93A096]">
          Response Time History
        </h3>
        <span className="text-body-md text-[#93A096]">
          avg {avg.toFixed(0)}ms &middot; {checks.length} samples
        </span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(238,234,224,0.06)" />
            <XAxis
              dataKey="time"
              tick={{ fill: "#93A096", fontSize: 10, fontFamily: "Instrument Sans" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(238,234,224,0.06)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#93A096", fontSize: 10, fontFamily: "Instrument Sans" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(238,234,224,0.06)" }}
              unit="ms"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(7,11,9,0.95)",
                border: "1px solid rgba(238,234,224,0.1)",
                borderRadius: 9,
                fontSize: 12,
                fontFamily: "Instrument Sans",
              }}
              labelStyle={{ color: "#93A096" }}
              formatter={(value: unknown, _name: unknown, entry: { payload?: { status?: string; statusCode?: number | null } }) => {
                const v = typeof value === "number" ? value : 0;
                const p = entry?.payload;
                return [
                  <span key="val" className="text-[#EEEAE0]">{v}ms</span>,
                  <span key="name" className={p?.status === "UP" ? "text-[#9FD8BD]" : "text-[#C2766B]"}>
                    {p?.status ?? "N/A"}{p?.statusCode ? ` (HTTP ${p.statusCode})` : ""}
                  </span>,
                ];
              }}
            />
            <Line
              type="monotone"
              dataKey="responseTime"
              stroke="#9FD8BD"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#9FD8BD", stroke: "#070B09", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
