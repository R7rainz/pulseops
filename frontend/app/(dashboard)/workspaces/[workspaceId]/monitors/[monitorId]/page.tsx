import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import type { MonitorCheck, MonitorStats } from "@/lib/types";
import MonitorCharts from "@/components/MonitorCharts";
import MonitorCheckLog from "@/components/MonitorCheckLog";
import { scheduleMaintenance } from "../actions";
import {
  ArrowLeft, Activity, ServerCrash, PauseCircle,
  TerminalSquare, Lock, AlertTriangle, ShieldCheck, ShieldAlert, Wrench,
} from "lucide-react";

interface MonitorDiag {
  id: number;
  name: string;
  url: string;
  method: string;
  status: "UP" | "DOWN" | "PAUSED" | "DEGRADED";
  intervalSeconds: number;
  consecutiveFailures: number;
  graceThreshold: number;
  tlsIssuer: string | null;
  tlsValidTo: string | null;
  tlsDaysRemaining: number | null;
  lastCheckedAt: string | null;
  maintenanceStartAt: string | null;
  maintenanceEndAt: string | null;
}

export default async function MonitorDiagnosticsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; monitorId: string }>;
}) {
  const { workspaceId, monitorId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;

  if (!token) redirect("/login");

  let monitor: MonitorDiag | null = null;
  let checks: MonitorCheck[] = [];
  let stats: MonitorStats | null = null;
  let role: string | null = null;

  try {
    const [monitorRes, wsRes] = await Promise.all([
      apiFetch(
        `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}/monitors/${monitorId}`,
        { token, cookieStore, cache: "no-store" },
      ),
      apiFetch(
        `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}`,
        { token, cookieStore, cache: "no-store" },
      ),
    ]);

    if (monitorRes.status === 401 || monitorRes.status === 403) redirect("/login");

    if (monitorRes.ok) {
      const json = await monitorRes.json();
      monitor = json.data;
    }

    if (wsRes.ok) {
      const wsData = await wsRes.json();
      role = wsData.data?.role ?? null;
    }
  } catch (error) {
    console.error("Diag fetch failed:", error);
  }

  const canEdit = role === "OWNER" || role === "ADMIN";

  let analytics: Record<string, unknown> | null = null;

  if (monitor) {
    try {
      const [checksRes, statsRes, analyticsRes] = await Promise.all([
        apiFetch(
          `http://127.0.0.1:4000/api/v1/monitors/${monitor.id}/checks?limit=100&offset=0`,
          { token, cookieStore, cache: "no-store" },
        ),
        apiFetch(
          `http://127.0.0.1:4000/api/v1/monitors/${monitor.id}/stats`,
          { token, cookieStore, cache: "no-store" },
        ),
        apiFetch(
          `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}/monitors/${monitor.id}/analytics`,
          { token, cookieStore, cache: "no-store" },
        ),
      ]);
      if (checksRes.ok) {
        const json = await checksRes.json();
        checks = json.data ?? [];
      }
      if (statsRes.ok) {
        const json = await statsRes.json();
        stats = json.data ?? null;
      }
      if (analyticsRes.ok) {
        const json = await analyticsRes.json();
        analytics = json.data ?? null;
      }
    } catch (error) {
      console.error("Charts/stats/analytics fetch failed:", error);
    }
  }

  if (!monitor) {
    return (
      <div className="p-12 text-center text-zinc-500 font-mono text-xs uppercase tracking-widest">
        Telemetry target not found or access denied.
      </div>
    );
  }

  const isUp = monitor.status === "UP";
  const isDown = monitor.status === "DOWN";
  const isPaused = monitor.status === "PAUSED";
  const isDegraded = monitor.status === "DEGRADED";
  const isSslExpiring = monitor.tlsDaysRemaining !== null && monitor.tlsDaysRemaining <= 7;

  return (
    <main className="p-8 md:p-12 font-mono text-zinc-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Navigation */}
        <Link
          href={`/workspaces/${workspaceId}/monitors`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-cyan-400 hover:border-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Matrix
        </Link>

        {/* Master Header */}
        <div className="p-8 border-2 border-zinc-800 bg-zinc-950 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[8px_8px_0px_0px_rgba(34,211,238,0.05)]">
          <div className="flex items-center gap-6">
            <div className={`p-4 border-2 ${
              isUp ? "bg-emerald-950 border-emerald-500 text-emerald-400" :
              isDown ? "bg-red-950 border-red-500 text-red-400 animate-pulse" :
              isDegraded ? "bg-amber-950 border-amber-500 text-amber-400" :
              "bg-zinc-900 border-zinc-700 text-zinc-500"
            }`}>
              {isUp && <Activity className="w-8 h-8" />}
              {isDown && <ServerCrash className="w-8 h-8" />}
              {isDegraded && <AlertTriangle className="w-8 h-8" />}
              {isPaused && <PauseCircle className="w-8 h-8" />}
            </div>

            <div>
              <h1 className="text-2xl font-black uppercase tracking-widest text-zinc-100 flex items-center gap-3">
                {monitor.name}
              </h1>
              <p className="text-sm text-zinc-400 mt-1">{monitor.url}</p>
            </div>
          </div>

          <div className="text-right flex flex-col items-end">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Current State</span>
            <span className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest border-2 ${
              isUp ? "border-emerald-500 text-emerald-400" :
              isDown ? "border-red-500 text-red-400" :
              isDegraded ? "border-amber-500 text-amber-400" :
              "border-zinc-700 text-zinc-400"
            }`}>
              {monitor.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Core Telemetry Config */}
          <div className="p-6 border-2 border-zinc-900 bg-zinc-950 space-y-6">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 border-b-2 border-zinc-900 pb-2">
              <TerminalSquare className="w-4 h-4 text-cyan-500" /> Routing Configuration
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Protocol</p>
                <p className="text-sm text-zinc-200 mt-1">{monitor.method}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Interval</p>
                <p className="text-sm text-zinc-200 mt-1">{monitor.intervalSeconds}s</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Threshold Drops</p>
                <p className="text-sm text-zinc-200 mt-1">{monitor.consecutiveFailures} / {monitor.graceThreshold}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Last Contact</p>
                <p className="text-sm text-zinc-200 mt-1">
                  {monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleTimeString() : "Pending..."}
                </p>
              </div>
            </div>
          </div>

          {/* SSL Cryptographic Profile */}
          <div className={`p-6 border-2 transition-colors ${
            isSslExpiring ? "border-amber-900/50 bg-amber-950/10" : "border-zinc-900 bg-zinc-950"
          } space-y-6`}>
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 border-b-2 border-zinc-900 pb-2">
              <Lock className={`w-4 h-4 ${isSslExpiring ? "text-amber-500" : "text-emerald-500"}`} />
              Cryptographic Profile
            </h2>

            {monitor.tlsIssuer ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Certificate Authority</p>
                  <p className="text-sm text-zinc-200 mt-1 truncate">{monitor.tlsIssuer}</p>
                </div>

                <div className="flex justify-between items-end border-t-2 border-zinc-900 pt-4">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Expiration Epoch</p>
                    <p className="text-sm text-zinc-200 mt-1">
                      {monitor.tlsValidTo ? new Date(monitor.tlsValidTo).toLocaleDateString() : "Unknown"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Status</p>
                    <div className={`flex items-center gap-2 mt-1 ${
                      isSslExpiring ? "text-amber-400 font-black" : "text-emerald-400"
                    }`}>
                      {isSslExpiring ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      {monitor.tlsDaysRemaining} Days Left
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-600 text-[10px] uppercase tracking-widest font-bold">
                No TLS Certificate Detected. Standard HTTP Routing.
              </div>
            )}
          </div>

        </div>

        {/* SLA & Historical Analytics */}
        {analytics && (
          <div className="p-6 border-2 border-zinc-900 bg-zinc-950">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest border-b-2 border-zinc-900 pb-4 mb-6">
              30-Day Service Level Agreement (SLA)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x-0 md:divide-x-2 divide-zinc-900">
              <div className="flex flex-col md:px-6 first:pl-0">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Rolling Uptime</span>
                <span className={`text-3xl font-black tracking-widest ${
                  (analytics.uptime30Day as number) >= 99.9 ? "text-emerald-400" :
                  (analytics.uptime30Day as number) >= 99.0 ? "text-amber-400" : "text-red-400"
                }`}>
                  {analytics.uptime30Day as string}%
                </span>
              </div>
              <div className="flex flex-col md:px-6">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Total Breaches</span>
                <span className="text-2xl font-bold text-zinc-200">
                  {analytics.totalOutages30Day as number} <span className="text-xs text-zinc-600">Events</span>
                </span>
              </div>
              <div className="flex flex-col md:px-6">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Total Downtime</span>
                <span className="text-2xl font-bold text-zinc-200">
                  {analytics.downtimeMinutes30Day as number} <span className="text-xs text-zinc-600">Mins</span>
                </span>
              </div>
              <div className="flex flex-col md:px-6">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Avg Latency (24h)</span>
                <span className="text-2xl font-bold text-cyan-400">
                  {analytics.avgLatency24h as number} <span className="text-xs text-cyan-900">ms</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Scheduled Maintenance */}
        <div className="p-6 border-2 border-zinc-900 bg-zinc-950 space-y-6">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 border-b-2 border-zinc-900 pb-2">
            <Wrench className="w-4 h-4 text-amber-500" /> Scheduled Maintenance
          </h2>

          {canEdit ? (
            <form action={scheduleMaintenance} className="space-y-4">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="monitorId" value={monitor.id} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="maintenanceStartAt" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Start Time
                  </label>
                  <input
                    id="maintenanceStartAt"
                    name="maintenanceStartAt"
                    type="datetime-local"
                    defaultValue={monitor.maintenanceStartAt ? new Date(monitor.maintenanceStartAt).toISOString().slice(0, 16) : ""}
                    className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-3 text-zinc-100 text-sm font-mono focus:outline-none focus:border-amber-500 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="maintenanceEndAt" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    End Time
                  </label>
                  <input
                    id="maintenanceEndAt"
                    name="maintenanceEndAt"
                    type="datetime-local"
                    defaultValue={monitor.maintenanceEndAt ? new Date(monitor.maintenanceEndAt).toISOString().slice(0, 16) : ""}
                    className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-3 text-zinc-100 text-sm font-mono focus:outline-none focus:border-amber-500 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold uppercase tracking-widest py-2 px-5 border-2 border-transparent transition-all text-xs"
                >
                  Schedule Maintenance
                </button>
                {monitor.maintenanceStartAt && (
                  <button
                    type="submit"
                    name="clear"
                    value="true"
                    className="bg-zinc-900 hover:bg-red-950 text-zinc-400 hover:text-red-400 font-bold uppercase tracking-widest py-2 px-5 border-2 border-zinc-800 hover:border-red-500 transition-all text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {monitor.maintenanceStartAt && (
                <div className="text-[10px] text-zinc-500 font-mono pt-2 border-t-2 border-zinc-900">
                  Current window: {new Date(monitor.maintenanceStartAt).toLocaleString()} — {new Date(monitor.maintenanceEndAt!).toLocaleString()}
                </div>
              )}
            </form>
          ) : (
            <div className="py-4 text-center text-zinc-600 text-[10px] uppercase tracking-widest font-bold border-2 border-dashed border-zinc-800">
              Elevated privileges required to configure maintenance windows.
            </div>
          )}
        </div>

        {/* Telemetry Charts */}
        <MonitorCharts checks={checks} stats={stats} />

        {/* Probe Log */}
        <MonitorCheckLog monitorId={monitor.id} token={token} />

      </div>
    </main>
  );
}
