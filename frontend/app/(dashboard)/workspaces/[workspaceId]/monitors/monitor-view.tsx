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
      <div className="flex items-center justify-between border-b border-[rgba(238,234,224,0.08)] pb-2">
        <h2 className="text-sm font-medium text-[#93A096]">
          Telemetry {view === "grid" ? "Grid" : "Matrix"} <span className="text-[#9FD8BD] text-[10px] ml-2">LIVE</span>
        </h2>

        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-[#93A096]">
            [{monitors.length} Nodes]
          </span>
          <div className="flex items-center gap-1 bg-transparent border border-[rgba(238,234,224,0.08)] p-1">
            <button
              onClick={() => handleViewChange("grid")}
              className={`p-1.5 transition-colors ${view === "grid"
                ? "bg-[rgba(238,234,224,0.06)] text-[#9FD8BD]"
                : "text-[#93A096] hover:text-[#EEEAE0]"
                }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleViewChange("matrix")}
              className={`p-1.5 transition-colors ${view === "matrix"
                ? "bg-[rgba(238,234,224,0.06)] text-[#9FD8BD]"
                : "text-[#93A096] hover:text-[#EEEAE0]"
                }`}
              title="Matrix Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {monitors.length === 0 ? (
        <div className="p-12 border border-dashed border-[rgba(238,234,224,0.06)] bg-transparent text-center text-[#93A096] text-sm font-medium">
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
            <div className="border border-[rgba(238,234,224,0.06)] bg-transparent overflow-x-auto">
              <div className="min-w-[900px] grid grid-cols-12 gap-4 px-6 py-4 border-b border-[rgba(238,234,224,0.06)] bg-[rgba(238,234,224,0.04)] text-[10px] font-medium text-[#93A096]">
                <div className="col-span-1">State</div>
                <div className="col-span-2">Designation</div>
                <div className="col-span-3">Endpoint</div>
                <div className="col-span-2">Protocol</div>
                <div className="col-span-2">Threshold</div>
                <div className="col-span-2 text-right">Operations</div>
              </div>

              <div className="min-w-[900px] divide-y divide-[rgba(238,234,224,0.08)]">
                {monitors.map((node) => {
                  const isDown = node.status === "DOWN";
                  const isPaused = node.status === "PAUSED";
                  const isDegraded = node.status === "DEGRADED";
                  const isFailing = (isDegraded || node.consecutiveFailures > 0) && node.consecutiveFailures < (node.graceThreshold || 3);
                  const isUp = node.status === "UP" && !isFailing;

                  return (
                    <div key={node.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-[rgba(238,234,224,0.04)] transition-colors group">

                      <div className="col-span-1 flex items-center">
                        {isUp && <Activity className="w-5 h-5 text-[#9FD8BD]" />}
                        {isDown && <ServerCrash className="w-5 h-5 text-[#C2766B] animate-pulse" />}
                        {isPaused && <PauseCircle className="w-5 h-5 text-[#93A096]" />}
                        {isFailing && <AlertTriangle className="w-5 h-5 text-[#E2A356]" />}
                      </div>

                      <div className="col-span-2 min-w-0">
                        <p className="text-sm font-medium text-[#EEEAE0] truncate">{node.name}</p>
                        <p className="text-[10px] text-[#93A096] mt-1">ID: {node.id}</p>
                      </div>

                      <div className="col-span-3 min-w-0">
                        <p className="text-xs text-[#93A096] truncate border-l border-[rgba(238,234,224,0.06)] pl-3">{node.url}</p>
                      </div>

                      <div className="col-span-2">
                        <div className="inline-flex items-center gap-2 px-2 py-1 bg-transparent border border-[rgba(238,234,224,0.06)]">
                          <span className={`text-[10px] font-medium ${node.method === 'GET' ? 'text-[#A3D1DF]' : 'text-[#C2766B]'}`}>
                            {node.method || "GET"}
                          </span>
                          <span className="text-[10px] text-[#93A096]">{node.intervalSeconds || 60}s</span>
                        </div>
                      </div>

                      <div className="col-span-2 flex items-center gap-2">
                        {isPaused ? (
                          <span className="text-[10px] text-[#93A096] font-medium">Suspended</span>
                        ) : (
                          <div className="flex gap-1" title={`${node.consecutiveFailures} / ${node.graceThreshold} failures`}>
                            {Array.from({ length: node.graceThreshold || 3 }).map((_, i) => (
                              <div key={i} className={`w-2 h-4 ${i < node.consecutiveFailures ? 'bg-[#E2A356]' : 'bg-[rgba(238,234,224,0.06)]'}`} />
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
                                  <button type="submit" className="p-1.5 border border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#E2A356] hover:border-[#E2A356]/40 transition-colors"><Pause className="w-3.5 h-3.5" /></button>
                                </form>
                              ) : (
                                <form action={resumeMonitor}>
                                  <input type="hidden" name="workspaceId" value={workspaceId} />
                                  <input type="hidden" name="monitorId" value={node.id} />
                                  <button type="submit" className="p-1.5 border border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#9FD8BD] hover:border-[#9FD8BD]/40 transition-colors"><Play className="w-3.5 h-3.5" /></button>
                                </form>
                              )}
                              <form action={triggerCheck}>
                                <input type="hidden" name="workspaceId" value={workspaceId} />
                                <input type="hidden" name="monitorId" value={node.id} />
                                <button type="submit" className="p-1.5 border border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#A3D1DF] hover:border-[#A3D1DF]/40 transition-colors"><ExternalLink className="w-3.5 h-3.5" /></button>
                              </form>
                              <form action={deleteMonitor}>
                                <input type="hidden" name="workspaceId" value={workspaceId} />
                                <input type="hidden" name="monitorId" value={node.id} />
                                <button type="submit" className="p-1.5 border border-[rgba(238,234,224,0.06)] text-[#93A096] hover:text-[#C2766B] hover:border-[#C2766B]/40 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                              </form>
                            </>
                          )}
                        </div>
                        <Link
                          href={`/workspaces/${workspaceId}/monitors/${node.id}`}
                          className="px-3 py-1.5 bg-transparent border border-[rgba(238,234,224,0.06)] hover:border-[#9FD8BD]/40 text-[#93A096] hover:text-[#9FD8BD] text-[10px] font-medium transition-colors ml-2"
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
