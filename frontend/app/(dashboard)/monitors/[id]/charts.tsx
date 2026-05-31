"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// ⚠️ We assume your backend returns an array of past checks.
// Adjust these keys if your Fastify JSON uses different property names!
export function UptimeChart({ data = [] }: { data: any[] }) {
  // Format the data so Recharts can easily plot it
  const chartData = data.map((check) => ({
    time: new Date(check.createdAt || Date.now()).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    ping: check.responseTimeMs || 0,
    status: check.status,
  }));

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
        Not enough telemetry data to generate a chart.
      </div>
    );
  }

  return (
    <div className="h-[350px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorPing" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            stroke="#52525b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#52525b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}ms`}
          />
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#27272a"
            vertical={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              borderColor: "#27272a",
              borderRadius: "8px",
              color: "#f4f4f5",
            }}
            itemStyle={{ color: "#34d399" }}
          />
          <Area
            type="monotone"
            dataKey="ping"
            stroke="#34d399"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorPing)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
