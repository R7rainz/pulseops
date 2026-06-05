"use client";

import type { MonitorCheck } from "@/lib/types";

interface Props {
  checks: MonitorCheck[];
}

export default function MonitorCheckLog({ checks }: Props) {
  if (checks.length === 0) {
    return (
      <div className="p-6 border-2 border-zinc-900 bg-zinc-950 space-y-4">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 border-b-2 border-zinc-900 pb-2">
          Probe Log
        </h2>
        <div className="py-8 text-center text-zinc-600 text-[10px] uppercase tracking-widest font-bold">
          No probe data recorded yet.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 border-2 border-zinc-900 bg-zinc-950 space-y-4">
      <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 border-b-2 border-zinc-900 pb-2">
        Probe Log
        <span className="text-[10px] text-zinc-600 font-normal ml-auto">{checks.length} entries</span>
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b-2 border-zinc-900 text-zinc-500 uppercase tracking-widest text-[10px]">
              <th className="text-left py-2 pr-4 font-bold">Time</th>
              <th className="text-left py-2 pr-4 font-bold">Status</th>
              <th className="text-left py-2 pr-4 font-bold">Code</th>
              <th className="text-left py-2 pr-4 font-bold">Latency</th>
              <th className="text-left py-2 font-bold">Error</th>
            </tr>
          </thead>
          <tbody>
            {[...checks].reverse().map((check) => (
              <tr key={check.id} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                <td className="py-2 pr-4 text-zinc-400 whitespace-nowrap">
                  {new Date(check.checkedAt).toLocaleString()}
                </td>
                <td className="py-2 pr-4">
                  <span className={`font-bold ${
                    check.status === "UP" ? "text-emerald-400" :
                    check.status === "DEGRADED" ? "text-amber-400" :
                    "text-red-400"
                  }`}>
                    {check.status}
                  </span>
                </td>
                <td className="py-2 pr-4 text-zinc-300">
                  {check.statusCode ?? "—"}
                </td>
                <td className="py-2 pr-4 text-zinc-300">
                  {check.responseTimeMs != null ? `${check.responseTimeMs}ms` : "—"}
                </td>
                <td className="py-2 text-zinc-500 max-w-[200px] truncate">
                  {check.errorMessage ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
