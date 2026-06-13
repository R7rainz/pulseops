"use client";

import { useLiveMonitors } from "../hooks/use-live-monitors";
import Link from "next/link";
import {
  Trash2, Play, Pause, ExternalLink, Activity, ServerCrash,
  ArrowUpCircle, ArrowDownCircle,
} from "lucide-react";
import { pauseMonitor, resumeMonitor, triggerCheck, deleteMonitor } from "@/app/(dashboard)/workspaces/[workspaceId]/monitors/actions";

interface Monitor {
  id: number;
  name: string;
  url: string;
  method: string;
  intervalSeconds: number;
  status: "UP" | "DOWN" | "PAUSED" | "DEGRADED";
  consecutiveFailures: number;
  graceThreshold: number;
  lastCheckedAt: string | null;
}

interface MonitorGridProps {
  workspaceId: string;
  initialMonitors: Monitor[];
  canEdit: boolean;
}

export default function MonitorGrid({ workspaceId, initialMonitors, canEdit }: MonitorGridProps) {
  const { liveData } = useLiveMonitors(Number(workspaceId));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {initialMonitors.map((monitor) => {
        const live = liveData[monitor.id];
        const currentStatus = live ? live.status : monitor.status;
        const isUp = currentStatus === "UP";
        const isDown = currentStatus === "DOWN";
        const isPaused = currentStatus === "PAUSED";
        const isDegraded = currentStatus === "DEGRADED";

        return (
          <div
            key={monitor.id}
            className={`flex flex-col justify-between h-44 p-6 border-2 transition-colors group ${
              isDown
                ? "border-red-900 bg-red-950/10 hover:border-red-500"
                : isDegraded
                  ? "border-amber-900 bg-amber-950/10 hover:border-amber-500"
                  : "bg-zinc-950 border-zinc-800 hover:border-emerald-500/50"
            }`}
          >
            <Link
              href={`/workspaces/${workspaceId}/monitors/${monitor.id}`}
              className="flex items-start gap-4"
            >
              <div className="flex-shrink-0 mt-1">
                {isUp && <ArrowUpCircle className="w-5 h-5 text-emerald-500" />}
                {isDown && <ArrowDownCircle className="w-5 h-5 text-red-500 animate-pulse" />}
                {isDegraded && <Activity className="w-5 h-5 text-amber-500" />}
                {isPaused && <Pause className="w-5 h-5 text-zinc-600" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-zinc-100 uppercase tracking-widest truncate">
                  {monitor.name}
                </h3>
                <p className="text-xs text-zinc-500 truncate mt-1">
                  {monitor.url}
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-4 mt-2 pt-3 border-t-2 border-zinc-900">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Latency</span>
                <span className={`text-base font-black ${
                  isDown ? "text-red-400" : isDegraded ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {live ? `${live.latency}ms` : "---"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">HTTP</span>
                <span className={`text-base font-black ${
                  isDown ? "text-red-400" : "text-zinc-300"
                }`}>
                  {live?.statusCode ?? "---"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Last Ping</span>
                <span className="text-xs text-zinc-400">
                  {live?.lastChecked
                    ? new Date(live.lastChecked).toLocaleTimeString()
                    : monitor.lastCheckedAt
                      ? new Date(monitor.lastCheckedAt).toLocaleTimeString()
                      : "Awaiting..."}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {canEdit && (
                <>
                  {!isPaused ? (
                    <form action={pauseMonitor}>
                      <input type="hidden" name="workspaceId" value={workspaceId} />
                      <input type="hidden" name="monitorId" value={monitor.id} />
                      <button type="submit" className="p-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-amber-400 hover:border-amber-500 transition-colors" title="Pause Target">
                        <Pause className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <form action={resumeMonitor}>
                      <input type="hidden" name="workspaceId" value={workspaceId} />
                      <input type="hidden" name="monitorId" value={monitor.id} />
                      <button type="submit" className="p-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-emerald-400 hover:border-emerald-500 transition-colors" title="Resume Target">
                        <Play className="w-4 h-4" />
                      </button>
                    </form>
                  )}
                  <form action={triggerCheck}>
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="monitorId" value={monitor.id} />
                    <button type="submit" className="p-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-cyan-400 hover:border-cyan-500 transition-colors" title="Trigger Check">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </form>
                  <form action={deleteMonitor}>
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="monitorId" value={monitor.id} />
                    <button type="submit" className="p-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors" title="Purge Target">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
