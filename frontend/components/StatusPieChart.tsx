"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { MonitorStats } from "@/lib/types";
import { useThemeColors } from "@/lib/useThemeColors";

interface Props {
  stats: MonitorStats;
}

export default function StatusPieChart({ stats }: Props) {
  const c = useThemeColors();
  const data = [
    { name: "Up", value: stats.upChecks },
    { name: "Degraded", value: stats.degradedChecks },
    { name: "Down", value: stats.downChecks },
  ];
  const colors = [c.up, c.degraded, c.down];

  if (stats.totalChecks === 0) {
    return <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No data</div>;
  }

  const uptimePct = stats.uptimePercentage.toFixed(1);

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={34}
              outerRadius={50}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
            >
              {data.map((d, index) => (
                <Cell key={`cell-${index}`} fill={colors[index]} opacity={d.value === 0 ? 0.2 : 1} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-base font-semibold tabular-nums text-foreground">{uptimePct}%</span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">up</span>
        </div>
      </div>

      <ul className="space-y-1.5 text-sm">
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-up" />
          <span className="text-muted-foreground">Up</span>
          <span className="ml-auto font-mono tabular-nums text-foreground">{stats.upChecks}</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-degraded" />
          <span className="text-muted-foreground">Degraded</span>
          <span className="ml-auto font-mono tabular-nums text-foreground">{stats.degradedChecks}</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-down" />
          <span className="text-muted-foreground">Down</span>
          <span className="ml-auto font-mono tabular-nums text-foreground">{stats.downChecks}</span>
        </li>
      </ul>
    </div>
  );
}
