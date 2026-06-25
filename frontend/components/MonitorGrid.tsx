"use client";

import { useLiveMonitors } from "../hooks/use-live-monitors";
import Link from "next/link";
import {
  Trash2, Play, Pause, ExternalLink, Activity,
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
            className={`gradient-border-shell group ${
              isDown ? "" : ""
            }`}
          >
            <div className={`shell-inner flex flex-col justify-between h-44 p-[12px] ${
              isDown ? "border border-[rgba(194,118,107,0.2)]" :
              isDegraded ? "border border-[rgba(226,163,86,0.2)]" :
              "border border-transparent"
            }`}>
              <Link
                href={`/workspaces/${workspaceId}/monitors/${monitor.id}`}
                className="flex items-start gap-4"
              >
                <div className="flex-shrink-0 mt-1">
                  {isUp && <ArrowUpCircle className="w-5 h-5 text-[#9FD8BD]" />}
                  {isDown && <ArrowDownCircle className="w-5 h-5 text-[#C2766B] animate-breathe" />}
                  {isDegraded && <Activity className="w-5 h-5 text-[#E2A356]" />}
                  {isPaused && <Pause className="w-5 h-5 text-[#93A096]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-[#EEEAE0] truncate">
                    {monitor.name}
                  </h3>
                  <p className="text-body-md text-[#93A096] truncate mt-1">
                    {monitor.url}
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-4 mt-2 pt-3 border-t border-[rgba(238,234,224,0.06)]">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#93A096] font-medium">Latency</span>
                  <span className={`text-sm font-medium ${
                    isDown ? "text-[#C2766B]" : isDegraded ? "text-[#E2A356]" : "text-[#9FD8BD]"
                  }`}>
                    {live ? `${live.latency}ms` : "---"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#93A096] font-medium">HTTP</span>
                  <span className={`text-sm font-medium ${
                    isDown ? "text-[#C2766B]" : "text-[#EEEAE0]"
                  }`}>
                    {live?.statusCode ?? "---"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#93A096] font-medium">Last Ping</span>
                  <span className="text-xs text-[#EEEAE0]/70">
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
                        <button type="submit" className="p-1.5 border border-[rgba(238,234,224,0.1)] rounded-[999px] text-[#93A096] hover:text-[#E2A356] hover:border-[rgba(226,163,86,0.3)] transition-colors" title="Pause Target">
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <form action={resumeMonitor}>
                        <input type="hidden" name="workspaceId" value={workspaceId} />
                        <input type="hidden" name="monitorId" value={monitor.id} />
                        <button type="submit" className="p-1.5 border border-[rgba(238,234,224,0.1)] rounded-[999px] text-[#93A096] hover:text-[#9FD8BD] hover:border-[rgba(159,216,189,0.3)] transition-colors" title="Resume Target">
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    )}
                    <form action={triggerCheck}>
                      <input type="hidden" name="workspaceId" value={workspaceId} />
                      <input type="hidden" name="monitorId" value={monitor.id} />
                      <button type="submit" className="p-1.5 border border-[rgba(238,234,224,0.1)] rounded-[999px] text-[#93A096] hover:text-[#A3D1DF] hover:border-[rgba(163,209,223,0.3)] transition-colors" title="Trigger Check">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </form>
                    <form action={deleteMonitor}>
                      <input type="hidden" name="workspaceId" value={workspaceId} />
                      <input type="hidden" name="monitorId" value={monitor.id} />
                      <button type="submit" className="p-1.5 border border-[rgba(238,234,224,0.1)] rounded-[999px] text-[#93A096] hover:text-[#C2766B] hover:border-[rgba(194,118,107,0.3)] transition-colors" title="Purge Target">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
