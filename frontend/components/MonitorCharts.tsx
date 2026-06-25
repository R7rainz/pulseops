"use client";

import type { MonitorCheck, MonitorStats } from "@/lib/types";
import ResponseTimeChart from "./ResponseTimeChart";
import StatusPieChart from "./StatusPieChart";

interface Props {
  checks: MonitorCheck[];
  stats: MonitorStats | null;
}

function pctClass(v: number) {
  return v >= 98 ? "text-[#9FD8BD]" : v >= 90 ? "text-[#E2A356]" : "text-[#C2766B]";
}

export default function MonitorCharts({ checks, stats }: Props) {
  const r24 = stats?.range24h;
  const r30 = stats?.range30d;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <ResponseTimeChart checks={checks} />
      </div>
      <div className="gradient-border-shell">
        <div className="shell-inner p-[12px] space-y-4">
          <h2 className="text-sm font-medium text-[#93A096] flex items-center gap-2 border-b border-[rgba(238,234,224,0.06)] pb-2">
            Telemetry Overview
          </h2>
          {stats ? (
            <div className="space-y-4">
              <StatusPieChart stats={stats} />
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[rgba(238,234,224,0.06)]">
                <div>
                  <p className="text-[10px] text-[#93A096] font-medium">Total Probes</p>
                  <p className="text-lg text-[#EEEAE0] mt-1 font-medium">{stats.totalChecks}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#93A096] font-medium">Latest</p>
                  <p className={`text-lg mt-1 font-medium ${stats.latestStatus === "UP" ? "text-[#9FD8BD]" : stats.latestStatus === "DEGRADED" ? "text-[#E2A356]" : "text-[#C2766B]"}`}>
                    {stats.latestStatus}
                  </p>
                </div>
              </div>

              {/* 24h stats */}
              <div className="pt-2 border-t border-[rgba(238,234,224,0.06)]">
                <p className="text-[10px] text-[#93A096] font-medium mb-2">Last 24 Hours</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[9px] text-[#93A096]/60 font-medium">Uptime</p>
                    <p className={`text-sm font-medium ${r24 ? pctClass(r24.uptimePercentage) : "text-[#93A096]/60"}`}>
                      {r24 ? `${r24.uptimePercentage.toFixed(1)}%` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-[#93A096]/60 font-medium">Avg Latency</p>
                    <p className="text-sm text-[#EEEAE0] font-medium">
                      {r24 ? `${r24.averageResponseTimeMs.toFixed(0)}ms` : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 30d stats */}
              <div className="pt-2 border-t border-[rgba(238,234,224,0.06)]">
                <p className="text-[10px] text-[#93A096] font-medium mb-2">Last 30 Days</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[9px] text-[#93A096]/60 font-medium">Uptime</p>
                    <p className={`text-sm font-medium ${r30 ? pctClass(r30.uptimePercentage) : "text-[#93A096]/60"}`}>
                      {r30 ? `${r30.uptimePercentage.toFixed(1)}%` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-[#93A096]/60 font-medium">Avg Latency</p>
                    <p className="text-sm text-[#EEEAE0] font-medium">
                      {r30 ? `${r30.averageResponseTimeMs.toFixed(0)}ms` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-[#93A096]/60 text-body-md font-medium">
              No telemetry data collected yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
