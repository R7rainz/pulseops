"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trash2, Play, Pause, RefreshCw, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge, StatusDot } from "@/components/ui/status-badge";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { pauseMonitor, resumeMonitor, triggerCheck, deleteMonitor } from "./actions";
import MonitorGrid from "@/components/MonitorGrid";

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

export default function MonitorView({
  monitors,
  workspaceId,
  canEdit = false,
}: {
  monitors: Monitor[];
  workspaceId: string;
  canEdit?: boolean;
}) {
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const saved = localStorage.getItem("pulseops_view_pref");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a persisted UI preference on mount
    if (saved === "list" || saved === "grid") setView(saved);
  }, []);

  const handleViewChange = (next: "grid" | "list") => {
    setView(next);
    localStorage.setItem("pulseops_view_pref", next);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">Monitors</h2>
          <span className="font-mono text-xs text-muted-foreground">{monitors.length}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-up/30 bg-up/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-up">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-up" />
            </span>
            Live
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          <button
            onClick={() => handleViewChange("grid")}
            className={cn(
              "grid h-7 w-7 cursor-pointer place-items-center rounded-md transition-colors",
              view === "grid" ? "bg-surface-raised text-up" : "text-muted-foreground hover:text-foreground",
            )}
            title="Card grid"
            aria-label="Card grid view"
            aria-pressed={view === "grid"}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleViewChange("list")}
            className={cn(
              "grid h-7 w-7 cursor-pointer place-items-center rounded-md transition-colors",
              view === "list" ? "bg-surface-raised text-up" : "text-muted-foreground hover:text-foreground",
            )}
            title="List"
            aria-label="List view"
            aria-pressed={view === "list"}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {monitors.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="font-display text-base font-medium text-foreground">No monitors yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first endpoint to start tracking uptime and latency.
          </p>
        </div>
      ) : view === "grid" ? (
        <MonitorGrid workspaceId={workspaceId} initialMonitors={monitors} canEdit={canEdit} />
      ) : (
        <div className="glass overflow-x-auto rounded-lg">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Endpoint</th>
                <th className="px-5 py-3 font-medium">Method</th>
                <th className="px-5 py-3 font-medium">Failures</th>
                {canEdit && <th className="px-5 py-3 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {monitors.map((node) => {
                const grace = node.graceThreshold || 3;
                return (
                  <tr key={node.id} className="group transition-colors hover:bg-surface-raised/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <StatusDot status={node.status} />
                        <StatusBadge status={node.status} size="sm" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/workspaces/${workspaceId}/monitors/${node.id}`}
                        className="font-display text-sm font-medium text-foreground outline-none hover:text-up focus-visible:ring-2 focus-visible:ring-up/50"
                      >
                        {node.name}
                      </Link>
                    </td>
                    <td className="max-w-[280px] px-5 py-3.5">
                      <span className="block truncate font-mono text-xs text-muted-foreground">{node.url}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-2 font-mono text-xs">
                        <span className={node.method === "GET" ? "text-info" : "text-degraded"}>
                          {node.method || "GET"}
                        </span>
                        <span className="text-muted-foreground">{node.intervalSeconds || 60}s</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {node.status === "PAUSED" ? (
                        <span className="font-mono text-xs text-muted-foreground">Paused</span>
                      ) : (
                        <div className="flex items-center gap-1" title={`${node.consecutiveFailures} / ${grace} failures`}>
                          {Array.from({ length: grace }).map((_, i) => (
                            <span
                              key={i}
                              className={cn(
                                "h-3.5 w-1.5 rounded-full",
                                i < node.consecutiveFailures ? "bg-degraded" : "bg-border",
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {node.status !== "PAUSED" ? (
                            <form action={pauseMonitor}>
                              <input type="hidden" name="workspaceId" value={workspaceId} />
                              <input type="hidden" name="monitorId" value={node.id} />
                              <button type="submit" className="icon-btn h-8 w-8 hover:text-degraded hover:border-degraded/40" title="Pause monitor" aria-label="Pause monitor">
                                <Pause className="h-3.5 w-3.5" />
                              </button>
                            </form>
                          ) : (
                            <form action={resumeMonitor}>
                              <input type="hidden" name="workspaceId" value={workspaceId} />
                              <input type="hidden" name="monitorId" value={node.id} />
                              <button type="submit" className="icon-btn h-8 w-8 hover:text-up hover:border-up/40" title="Resume monitor" aria-label="Resume monitor">
                                <Play className="h-3.5 w-3.5" />
                              </button>
                            </form>
                          )}
                          <form action={triggerCheck}>
                            <input type="hidden" name="workspaceId" value={workspaceId} />
                            <input type="hidden" name="monitorId" value={node.id} />
                            <button type="submit" className="icon-btn h-8 w-8 hover:text-info hover:border-info/40" title="Run check now" aria-label="Run check now">
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          </form>
                          <form action={deleteMonitor}>
                            <input type="hidden" name="workspaceId" value={workspaceId} />
                            <input type="hidden" name="monitorId" value={node.id} />
                            <ConfirmSubmit
                              message={`Delete “${node.name}”? This removes its check history and cannot be undone.`}
                              className="icon-btn h-8 w-8 hover:text-down hover:border-down/40"
                              title="Delete monitor"
                              aria-label="Delete monitor"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </ConfirmSubmit>
                          </form>
                          <Link
                            href={`/workspaces/${workspaceId}/monitors/${node.id}`}
                            className="ml-1 rounded-full border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-up/40 hover:text-up"
                          >
                            Details
                          </Link>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
