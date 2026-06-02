"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { MonitorStats } from "@/lib/types";

interface Props {
  stats: MonitorStats;
}

export default function StatusPieChart({ stats }: Props) {
  const data = [
    { name: "UP", value: stats.upChecks },
    { name: "DOWN", value: stats.downChecks },
  ];

  const COLORS = ["#34d399", "#ef4444"];

  if (stats.totalChecks === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-600 text-xs font-bold uppercase tracking-widest">
        No data
      </div>
    );
  }

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={28}
            outerRadius={42}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index]}
                opacity={data[index].value === 0 ? 0.2 : 1}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
