"use client";

import { useLiveMonitors } from "../hooks/use-live-monitors";
import Link from "next/link";
import { Trash2, Play, Pause, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusMeta } from "@/lib/status";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import {
  pauseMonitor,
  resumeMonitor,
  triggerCheck,
  deleteMonitor,
} from "@/app/(dashboard)/workspaces/[workspaceId]/monitors/actions";

interface Monitor {
  id: number;
  name: string;
  type?: "HTTP" | "HEARTBEAT";
  url: string;
  method: string;
  intervalSeconds: number;
  status: "UP" | "DOWN" | "PAUSED" | "DEGRADED";
  consecutiveFailures: number;
  graceThreshold: number;
  lastCheckedAt: string | null;
  lastResponseTime?: number | null;
  lastStatusCode?: number | null;
}

interface MonitorGridProps {
  workspaceId: string;
  initialMonitors: Monitor[];
  canEdit: boolean;
}

export default function MonitorGrid({ workspaceId, initialMonitors, canEdit }: MonitorGridProps) {
  const { liveData } = useLiveMonitors(Number(workspaceId));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {initialMonitors.map((monitor) => {
        const live = liveData[monitor.id];
        const currentStatus = live ? live.status : monitor.status;
        const meta = statusMeta(currentStatus);
        const isDown = currentStatus === "DOWN";
        const isDegraded = currentStatus === "DEGRADED";
        const lastPing = live?.lastChecked ?? monitor.lastCheckedAt;

        return (
          <div
            key={monitor.id}
            className={cn(
              "glass group relative flex flex-col gap-4 overflow-hidden rounded-lg p-5 transition-colors duration-200",
              isDown
                ? "border-down/40"
                : isDegraded
                  ? "border-degraded/40"
                  : "hover:border-up/30",
            )}
          >
            {/* status accent strip */}
            <span className={cn("absolute inset-x-0 top-0 h-px", meta.solid, "opacity-60")} />

            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/workspaces/${workspaceId}/monitors/${monitor.id}`}
                className="min-w-0 flex-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-up/50"
              >
                <h3 className="truncate font-display text-base font-semibold tracking-tight text-foreground group-hover:text-up">
                  {monitor.name}
                </h3>
                <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{monitor.type === "HEARTBEAT" ? "Heartbeat (push)" : monitor.url}</p>
              </Link>
              <StatusBadge status={currentStatus} size="sm" />
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-border pt-3">
              <Metric label="Latency">
                <span className={cn(isDown ? "text-down" : isDegraded ? "text-degraded" : "text-up")}>
                  {live
                    ? `${live.latency}ms`
                    : monitor.lastResponseTime != null
                      ? `${monitor.lastResponseTime}ms`
                      : "—"}
                </span>
              </Metric>
              <Metric label="HTTP">
                <span className={isDown ? "text-down" : "text-foreground"}>
                  {live?.statusCode ?? monitor.lastStatusCode ?? "—"}
                </span>
              </Metric>
              <Metric label="Last check">
                <span className="text-muted-foreground">
                  {lastPing ? new Date(lastPing).toLocaleTimeString() : "Waiting…"}
                </span>
              </Metric>
            </div>

            {canEdit && (
              <div className="flex items-center justify-end gap-1.5">
                {currentStatus !== "PAUSED" ? (
                  <form action={pauseMonitor}>
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="monitorId" value={monitor.id} />
                    <button type="submit" className="icon-btn hover:text-degraded hover:border-degraded/40" title="Pause monitor" aria-label="Pause monitor">
                      <Pause className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <form action={resumeMonitor}>
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="monitorId" value={monitor.id} />
                    <button type="submit" className="icon-btn hover:text-up hover:border-up/40" title="Resume monitor" aria-label="Resume monitor">
                      <Play className="h-4 w-4" />
                    </button>
                  </form>
                )}
                {monitor.type !== "HEARTBEAT" && (
                  <form action={triggerCheck}>
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="monitorId" value={monitor.id} />
                    <button type="submit" className="icon-btn hover:text-info hover:border-info/40" title="Run check now" aria-label="Run check now">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </form>
                )}
                <form action={deleteMonitor}>
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="monitorId" value={monitor.id} />
                  <ConfirmSubmit
                    message={`Delete “${monitor.name}”? This removes its check history and cannot be undone.`}
                    className="icon-btn hover:text-down hover:border-down/40"
                    title="Delete monitor"
                    aria-label="Delete monitor"
                  >
                    <Trash2 className="h-4 w-4" />
                  </ConfirmSubmit>
                </form>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">{label}</span>
      <span className="font-mono text-sm font-semibold tabular-nums">{children}</span>
    </div>
  );
}
