"use client";

import type { MonitorCheck, MonitorStats } from "@/lib/types";
import ResponseTimeChart from "./ResponseTimeChart";
import StatusPieChart from "./StatusPieChart";
import { StatusBadge } from "@/components/ui/status-badge";

interface Props {
  checks: MonitorCheck[];
  stats: MonitorStats | null;
}

function pctClass(v: number) {
  return v >= 98 ? "text-up" : v >= 90 ? "text-degraded" : "text-down";
}

export default function MonitorCharts({ checks, stats }: Props) {
  const r24 = stats?.range24h;
  const r30 = stats?.range30d;

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <div className="md:col-span-2">
        <ResponseTimeChart checks={checks} />
      </div>

      <div className="glass space-y-4 rounded-lg p-6">
        <h2 className="border-b border-border pb-3 font-display text-sm font-semibold text-foreground">Overview</h2>

        {stats ? (
          <div className="space-y-4">
            <StatusPieChart stats={stats} />

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Total checks</p>
                <p className="mt-1 font-display text-lg font-semibold tabular-nums text-foreground">{stats.totalChecks}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Latest</p>
                <div className="mt-1">
                  <StatusBadge status={stats.latestStatus} size="sm" />
                </div>
              </div>
            </div>

            <RangeBlock title="Last 24 hours" uptime={r24?.uptimePercentage} latency={r24?.averageResponseTimeMs} pctClass={pctClass} />
            <RangeBlock title="Last 30 days" uptime={r30?.uptimePercentage} latency={r30?.averageResponseTimeMs} pctClass={pctClass} />
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">No data collected yet.</div>
        )}
      </div>
    </div>
  );
}

function RangeBlock({
  title,
  uptime,
  latency,
  pctClass,
}: {
  title: string;
  uptime?: number;
  latency?: number;
  pctClass: (v: number) => string;
}) {
  return (
    <div className="border-t border-border pt-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">Uptime</p>
          <p className={`text-sm font-semibold tabular-nums ${uptime != null ? pctClass(uptime) : "text-muted-foreground"}`}>
            {uptime != null ? `${uptime.toFixed(1)}%` : "—"}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">Avg latency</p>
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {latency != null ? `${latency.toFixed(0)}ms` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
