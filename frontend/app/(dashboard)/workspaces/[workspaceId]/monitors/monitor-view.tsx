"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trash2, Play, Pause, ExternalLink, Activity, ServerCrash,
  PauseCircle, AlertTriangle, LayoutGrid, List
} from "lucide-react";
import { pauseMonitor, resumeMonitor, triggerCheck, deleteMonitor } from "./actions";

interface Monitor {
  id: number;
  name: string;
  url: string;
  method: string;
  intervalSeconds: number;
  status: "UP" | "DOWN" | "PAUSED";
  consecutiveFailures: number;
  graceThreshold: number;
  lastCheckedAt: string | null;
}

export default function MonitorView({
  monitors,
  workspaceId,
}: {
  monitors: Monitor[];
  workspaceId: string;
}) {
  // Default to grid, but check localStorage so it remembers the user's choice
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
      {/* 🚨 THE TOGGLE HEADER 🚨 */}
      <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-2">
        <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-400">
          Telemetry {view === "grid" ? "Grid" : "Matrix"}
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
          {/*grid cards*/}
          {view === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {monitors.map((monitor) => (
                <div
                  key={monitor.id}
                  className="flex flex-col justify-between h-40 p-6 bg-zinc-950 border-2 border-zinc-800 hover:border-emerald-500/50 transition-colors group"
                >
                  <Link
                    href={`/workspaces/${workspaceId}/monitors/${monitor.id}`}
                    className="flex items-start gap-4"
                  >
                    <div
                      className={`w-3 h-3 mt-1.5 border flex-shrink-0 ${monitor.status === "UP"
                        ? "bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                        : monitor.status === "DOWN"
                          ? "bg-red-500 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                          : "bg-zinc-600 border-zinc-500"
                        }`}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-zinc-100 uppercase tracking-widest truncate">
                        {monitor.name}
                      </h3>
                      <p className="text-xs text-zinc-500 truncate mt-1">
                        {monitor.url}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-end justify-between mt-4 pt-4 border-t-2 border-zinc-900">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold flex flex-col gap-1">
                      <span className="text-zinc-600">Last Ping</span>
                      <span
                        className={
                          monitor.status === "UP" ? "text-emerald-400"
                            : monitor.status === "DOWN" ? "text-red-400" : ""
                        }
                      >
                        {monitor.lastCheckedAt
                          ? new Date(monitor.lastCheckedAt).toLocaleTimeString()
                          : "Awaiting..."}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {monitor.status !== "PAUSED" ? (
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                  const isFailing = node.consecutiveFailures > 0 && node.consecutiveFailures < (node.graceThreshold || 3);
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
