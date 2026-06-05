"use client";

import type { MonitorCheck, MonitorStats } from "@/lib/types";
import ResponseTimeChart from "./ResponseTimeChart";
import StatusPieChart from "./StatusPieChart";

interface Props {
  checks: MonitorCheck[];
  stats: MonitorStats | null;
}

export default function MonitorCharts({ checks, stats }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <ResponseTimeChart checks={checks} />
      </div>
      <div className="p-6 border-2 border-zinc-900 bg-zinc-950 space-y-4">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 border-b-2 border-zinc-900 pb-2">
          Telemetry Overview
        </h2>
        {stats ? (
          <div className="space-y-4">
            <StatusPieChart stats={stats} />
            <div className="grid grid-cols-2 gap-3 pt-2 border-t-2 border-zinc-900">
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total Probes</p>
                <p className="text-lg text-zinc-200 mt-1 font-black">{stats.totalChecks}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Uptime</p>
                <p className={`text-lg mt-1 font-black ${stats.uptimePercentage >= 98 ? "text-emerald-400" : stats.uptimePercentage >= 90 ? "text-amber-400" : "text-red-400"}`}>
                  {stats.uptimePercentage.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Avg Latency</p>
                <p className="text-lg text-zinc-200 mt-1 font-black">
                  {stats.averageResponseTimeMs.toFixed(0)}ms
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Latest</p>
                <p className={`text-lg mt-1 font-black ${stats.latestStatus === "UP" ? "text-emerald-400" : stats.latestStatus === "DEGRADED" ? "text-amber-400" : "text-red-400"}`}>
                  {stats.latestStatus}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-zinc-600 text-[10px] uppercase tracking-widest font-bold">
            No telemetry data collected yet.
          </div>
        )}
      </div>
    </div>
  );
}
