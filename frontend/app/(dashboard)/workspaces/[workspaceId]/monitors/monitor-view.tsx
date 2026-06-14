"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trash2, Play, Pause, ExternalLink, Activity, ServerCrash,
  PauseCircle, AlertTriangle, LayoutGrid, List,
} from "lucide-react";
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
  const [view, setView] = useState<"grid" | "matrix">("grid");

  useEffect(() => {
    const saved = localStorage.getItem("pulseops_view_pref");
    if (saved === "matrix" || saved === "grid") setView(saved);
  }, []);

  const handleViewChange = (newView: "grid" | "matrix") => {
    setView(newView);
    localStorage.setItem("pulseops_view_pref", newView);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-2">
        <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-400">
          Telemetry {view === "grid" ? "Grid" : "Matrix"} <span className="text-emerald-500 text-[10px] ml-2">LIVE</span>
        </h2>

        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
            [{monitors.length} Nodes]
          </span>
          <div className="flex items-center gap-1 bg-zinc-950 border-2 border-zinc-900 p-1">
            <button
              onClick={() => handleViewChange("grid")}
              className={`p-1.5 transition-colors ${view === "grid"
                ? "bg-zinc-800 text-emerald-400"
                : "text-zinc-600 hover:text-zinc-400"
                }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleViewChange("matrix")}
              className={`p-1.5 transition-colors ${view === "matrix"
                ? "bg-zinc-800 text-emerald-400"
                : "text-zinc-600 hover:text-zinc-400"
                }`}
              title="Matrix Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {monitors.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-zinc-800 bg-zinc-950 text-center text-zinc-500 text-sm font-bold uppercase tracking-widest">
          Zero targets provisioned in current workspace.
        </div>
      ) : (
        <>
          {view === "grid" && (
            <MonitorGrid
              workspaceId={workspaceId}
              initialMonitors={monitors}
              canEdit={canEdit}
            />
          )}

          {/*matrix or list view typeof*/}
          {view === "matrix" && (
            <div className="border-2 border-zinc-800 bg-zinc-950 overflow-x-auto">
              <div className="min-w-[900px] grid grid-cols-12 gap-4 px-6 py-4 border-b-2 border-zinc-800 bg-zinc-900 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <div className="col-span-1">State</div>
                <div className="col-span-2">Designation</div>
                <div className="col-span-3">Endpoint</div>
                <div className="col-span-2">Protocol</div>
                <div className="col-span-2">Threshold</div>
                <div className="col-span-2 text-right">Operations</div>
              </div>

              <div className="min-w-[900px] divide-y-2 divide-zinc-900">
                {monitors.map((node) => {
                  const isDown = node.status === "DOWN";
                  const isPaused = node.status === "PAUSED";
                  const isDegraded = node.status === "DEGRADED";
                  const isFailing = (isDegraded || node.consecutiveFailures > 0) && node.consecutiveFailures < (node.graceThreshold || 3);
                  const isUp = node.status === "UP" && !isFailing;

                  return (
                    <div key={node.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-900 transition-colors group">

                      <div className="col-span-1 flex items-center">
                        {isUp && <Activity className="w-5 h-5 text-emerald-400" />}
                        {isDown && <ServerCrash className="w-5 h-5 text-red-500 animate-pulse" />}
                        {isPaused && <PauseCircle className="w-5 h-5 text-zinc-600" />}
                        {isFailing && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                      </div>

                      <div className="col-span-2 min-w-0">
                        <p className="text-sm font-bold text-zinc-200 uppercase tracking-widest truncate">{node.name}</p>
                        <p className="text-[10px] text-zinc-500 mt-1">ID: {node.id}</p>
                      </div>

                      <div className="col-span-3 min-w-0">
                        <p className="text-xs text-zinc-400 truncate border-l-2 border-zinc-800 pl-3">{node.url}</p>
                      </div>

                      <div className="col-span-2">
                        <div className="inline-flex items-center gap-2 px-2 py-1 bg-zinc-950 border border-zinc-800">
                          <span className={`text-[10px] font-bold ${node.method === 'GET' ? 'text-cyan-400' : 'text-purple-400'}`}>
                            {node.method || "GET"}
                          </span>
                          <span className="text-[10px] text-zinc-500">{node.intervalSeconds || 60}s</span>
                        </div>
                      </div>

                      <div className="col-span-2 flex items-center gap-2">
                        {isPaused ? (
                          <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Suspended</span>
                        ) : (
                          <div className="flex gap-1" title={`${node.consecutiveFailures} / ${node.graceThreshold} failures`}>
                            {Array.from({ length: node.graceThreshold || 3 }).map((_, i) => (
                              <div key={i} className={`w-2 h-4 ${i < node.consecutiveFailures ? 'bg-amber-500' : 'bg-zinc-800'}`} />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEdit && (
                            <>
                              {node.status !== "PAUSED" ? (
                                <form action={pauseMonitor}>
                                  <input type="hidden" name="workspaceId" value={workspaceId} />
                                  <input type="hidden" name="monitorId" value={node.id} />
                                  <button type="submit" className="p-1.5 border border-zinc-800 text-zinc-500 hover:text-amber-400 hover:border-amber-500 transition-colors"><Pause className="w-3.5 h-3.5" /></button>
                                </form>
                              ) : (
                                <form action={resumeMonitor}>
                                  <input type="hidden" name="workspaceId" value={workspaceId} />
                                  <input type="hidden" name="monitorId" value={node.id} />
                                  <button type="submit" className="p-1.5 border border-zinc-800 text-zinc-500 hover:text-emerald-400 hover:border-emerald-500 transition-colors"><Play className="w-3.5 h-3.5" /></button>
                                </form>
                              )}
                              <form action={triggerCheck}>
                                <input type="hidden" name="workspaceId" value={workspaceId} />
                                <input type="hidden" name="monitorId" value={node.id} />
                                <button type="submit" className="p-1.5 border border-zinc-800 text-zinc-500 hover:text-cyan-400 hover:border-cyan-500 transition-colors"><ExternalLink className="w-3.5 h-3.5" /></button>
                              </form>
                              <form action={deleteMonitor}>
                                <input type="hidden" name="workspaceId" value={workspaceId} />
                                <input type="hidden" name="monitorId" value={node.id} />
                                <button type="submit" className="p-1.5 border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                              </form>
                            </>
                          )}
                        </div>
                        <Link
                          href={`/workspaces/${workspaceId}/monitors/${node.id}`}
                          className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 hover:border-emerald-500 text-zinc-400 hover:text-emerald-400 text-[10px] font-bold uppercase tracking-widest transition-colors ml-2"
                        >
                          DIAG
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
