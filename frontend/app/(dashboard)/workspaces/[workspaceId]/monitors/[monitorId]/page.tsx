import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
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
  let planTier: string | null = null;

  try {
    const [monitorRes, wsRes] = await Promise.all([
      apiFetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}/monitors/${monitorId}`,
        { token, cookieStore, cache: "no-store" },
      ),
      apiFetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}`,
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
      planTier = wsData.data?.planTier ?? null;
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
          `${API_URL}/api/v1/workspaces/${workspaceId}/monitors/${monitor.id}/checks?limit=100&offset=0`,
          { token, cookieStore, cache: "no-store" },
        ),
        apiFetch(
          `${API_URL}/api/v1/workspaces/${workspaceId}/monitors/${monitor.id}/stats`,
          { token, cookieStore, cache: "no-store" },
        ),
        apiFetch(
          `${API_URL}/api/v1/workspaces/${workspaceId}/monitors/${monitor.id}/analytics`,
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
      <div className="p-12 text-center text-[#93A096] text-xs font-medium">
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
    <main className="p-8 md:p-12 text-[#EEEAE0] min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Navigation */}
        <Link
          href={`/workspaces/${workspaceId}/monitors`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-xs font-medium text-[#93A096] hover:text-[#A3D1DF] hover:border-[#A3D1DF] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Matrix
        </Link>

        {/* Master Header */}
        <div className="p-8 border border-[rgba(238,234,224,0.06)] bg-transparent flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className={`p-4 border ${
              isUp ? "bg-[rgba(159,216,189,0.1)] border-[#9FD8BD] text-[#9FD8BD]" :
              isDown ? "bg-[rgba(194,118,107,0.1)] border-[#C2766B] text-[#C2766B] animate-pulse" :
              isDegraded ? "bg-[rgba(227,163,86,0.1)] border-[#E2A356] text-[#E2A356]" :
              "bg-[rgba(238,234,224,0.04)] border-[rgba(238,234,224,0.06)] text-[#93A096]"
            }`}>
              {isUp && <Activity className="w-8 h-8" />}
              {isDown && <ServerCrash className="w-8 h-8" />}
              {isDegraded && <AlertTriangle className="w-8 h-8" />}
              {isPaused && <PauseCircle className="w-8 h-8" />}
            </div>

            <div>
              <h1 className="text-2xl font-medium text-[#EEEAE0] flex items-center gap-3">
                {monitor.name}
              </h1>
              <p className="text-sm text-[#93A096] mt-1">{monitor.url}</p>
            </div>
          </div>

          <div className="text-right flex flex-col items-end">
            <span className="text-[10px] text-[#93A096] font-medium mb-1">Current State</span>
            <span className={`px-4 py-1.5 text-xs font-medium border ${
              isUp ? "border-[#9FD8BD] text-[#9FD8BD]" :
              isDown ? "border-[#C2766B] text-[#C2766B]" :
              isDegraded ? "border-[#E2A356] text-[#E2A356]" :
              "border-[rgba(238,234,224,0.06)] text-[#93A096]"
            }`}>
              {monitor.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Core Telemetry Config */}
          <div className="p-6 border border-[rgba(238,234,224,0.08)] bg-transparent space-y-6">
            <h2 className="text-sm font-medium text-[#93A096] flex items-center gap-2 border-b border-[rgba(238,234,224,0.08)] pb-2">
              <TerminalSquare className="w-4 h-4 text-[#A3D1DF]" /> Routing Configuration
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-[#93A096] font-medium">Protocol</p>
                <p className="text-sm text-[#EEEAE0] mt-1">{monitor.method}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#93A096] font-medium">Interval</p>
                <p className="text-sm text-[#EEEAE0] mt-1">{monitor.intervalSeconds}s</p>
              </div>
              <div>
                <p className="text-[10px] text-[#93A096] font-medium">Threshold Drops</p>
                <p className="text-sm text-[#EEEAE0] mt-1">{monitor.consecutiveFailures} / {monitor.graceThreshold}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#93A096] font-medium">Last Contact</p>
                <p className="text-sm text-[#EEEAE0] mt-1">
                  {monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleTimeString() : "Pending..."}
                </p>
              </div>
            </div>
          </div>

          {/* SSL Cryptographic Profile */}
          <div className={`p-6 border transition-colors ${
            isSslExpiring ? "border-[#E2A356]/50 bg-[rgba(227,163,86,0.1)]" : "border-[rgba(238,234,224,0.08)] bg-transparent"
          } space-y-6`}>
            <h2 className="text-sm font-medium text-[#93A096] flex items-center gap-2 border-b border-[rgba(238,234,224,0.08)] pb-2">
              <Lock className={`w-4 h-4 ${isSslExpiring ? "text-[#E2A356]" : "text-[#9FD8BD]"}`} />
              Cryptographic Profile
            </h2>

            {planTier !== "PRO" && monitor.tlsIssuer ? (
              <div className="py-8 text-center space-y-3">
                <ShieldAlert className="w-8 h-8 text-[#E2A356] mx-auto" />
                <p className="text-xs text-[#E2A356] font-medium">
                  PRO Tier Required
                </p>
                <p className="text-[10px] text-[#93A096]">
                  SSL/TLS Cryptographic telemetry is locked behind the PRO subscription.
                </p>
                <Link
                  href={`/workspaces/${workspaceId}/billing`}
                  className="inline-block mt-2 px-4 py-2 bg-[#E2A356] hover:bg-[#E2A356] text-zinc-950 font-medium text-xs rounded-[999px] transition-all"
                >
                  Upgrade to PRO
                </Link>
              </div>
            ) : monitor.tlsIssuer ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-[#93A096] font-medium">Certificate Authority</p>
                  <p className="text-sm text-[#EEEAE0] mt-1 truncate">{monitor.tlsIssuer}</p>
                </div>

                <div className="flex justify-between items-end border-t border-[rgba(238,234,224,0.08)] pt-4">
                  <div>
                    <p className="text-[10px] text-[#93A096] font-medium">Expiration Epoch</p>
                    <p className="text-sm text-[#EEEAE0] mt-1">
                      {monitor.tlsValidTo ? new Date(monitor.tlsValidTo).toLocaleDateString() : "Unknown"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#93A096] font-medium">Status</p>
                    <div className={`flex items-center gap-2 mt-1 ${
                      isSslExpiring ? "text-[#E2A356] font-medium" : "text-[#9FD8BD]"
                    }`}>
                      {isSslExpiring ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      {monitor.tlsDaysRemaining} Days Left
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-[#93A096] text-[10px] font-medium">
                No TLS Certificate Detected. Standard HTTP Routing.
              </div>
            )}
          </div>

        </div>

        {/* SLA & Historical Analytics */}
        {analytics && (
          <div className="p-6 border border-[rgba(238,234,224,0.08)] bg-transparent">
            <h2 className="text-sm font-medium text-[#93A096] border-b border-[rgba(238,234,224,0.08)] pb-4 mb-6">
              30-Day Service Level Agreement (SLA)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x-0 md:divide-x divide-[rgba(238,234,224,0.08)]">
              <div className="flex flex-col md:px-6 first:pl-0">
                <span className="text-[10px] text-[#93A096] font-medium mb-2">Rolling Uptime</span>
                <span className={`text-3xl font-medium ${
                  (analytics.uptime30Day as number) >= 99.9 ? "text-[#9FD8BD]" :
                  (analytics.uptime30Day as number) >= 99.0 ? "text-[#E2A356]" : "text-[#C2766B]"
                }`}>
                  {analytics.uptime30Day as string}%
                </span>
              </div>
              <div className="flex flex-col md:px-6">
                <span className="text-[10px] text-[#93A096] font-medium mb-2">Total Breaches</span>
                <span className="text-2xl font-medium text-[#EEEAE0]">
                  {analytics.totalOutages30Day as number} <span className="text-xs text-[#93A096]">Events</span>
                </span>
              </div>
              <div className="flex flex-col md:px-6">
                <span className="text-[10px] text-[#93A096] font-medium mb-2">Total Downtime</span>
                <span className="text-2xl font-medium text-[#EEEAE0]">
                  {analytics.downtimeMinutes30Day as number} <span className="text-xs text-[#93A096]">Mins</span>
                </span>
              </div>
              <div className="flex flex-col md:px-6">
                <span className="text-[10px] text-[#93A096] font-medium mb-2">Avg Latency (24h)</span>
                <span className="text-2xl font-medium text-[#A3D1DF]">
                  {analytics.avgLatency24h as number} <span className="text-xs text-[#A3D1DF]">ms</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Scheduled Maintenance */}
        <div className="p-6 border border-[rgba(238,234,224,0.08)] bg-transparent space-y-6">
          <h2 className="text-sm font-medium text-[#93A096] flex items-center gap-2 border-b border-[rgba(238,234,224,0.08)] pb-2">
            <Wrench className="w-4 h-4 text-[#E2A356]" /> Scheduled Maintenance
          </h2>

          {canEdit ? (
            <form action={scheduleMaintenance} className="space-y-4">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="monitorId" value={monitor.id} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="maintenanceStartAt" className="block text-[10px] font-medium text-[#93A096]">
                    Start Time
                  </label>
                  <input
                    id="maintenanceStartAt"
                    name="maintenanceStartAt"
                    type="datetime-local"
                    defaultValue={monitor.maintenanceStartAt ? new Date(monitor.maintenanceStartAt).toISOString().slice(0, 16) : ""}
                    className="w-full bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.06)] px-4 py-3 text-[#EEEAE0] text-sm focus:outline-none focus:border-[#E2A356] transition-colors [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="maintenanceEndAt" className="block text-[10px] font-medium text-[#93A096]">
                    End Time
                  </label>
                  <input
                    id="maintenanceEndAt"
                    name="maintenanceEndAt"
                    type="datetime-local"
                    defaultValue={monitor.maintenanceEndAt ? new Date(monitor.maintenanceEndAt).toISOString().slice(0, 16) : ""}
                    className="w-full bg-[rgba(238,234,224,0.04)] border border-[rgba(238,234,224,0.06)] px-4 py-3 text-[#EEEAE0] text-sm focus:outline-none focus:border-[#E2A356] transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-[#E2A356] hover:bg-[#E2A356] text-zinc-950 font-medium py-2 px-5 rounded-[999px] transition-all text-xs"
                >
                  Schedule Maintenance
                </button>
                {monitor.maintenanceStartAt && (
                  <button
                    type="submit"
                    name="clear"
                    value="true"
                    className="bg-[rgba(238,234,224,0.04)] hover:bg-[rgba(194,118,107,0.1)] text-[#93A096] hover:text-[#C2766B] font-medium py-2 px-5 border border-[rgba(238,234,224,0.06)] hover:border-[#C2766B]/40 transition-all text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {monitor.maintenanceStartAt && (
                <div className="text-[10px] text-[#93A096] pt-2 border-t border-[rgba(238,234,224,0.08)]">
                  Current window: {new Date(monitor.maintenanceStartAt).toLocaleString()} — {new Date(monitor.maintenanceEndAt!).toLocaleString()}
                </div>
              )}
            </form>
          ) : (
            <div className="py-4 text-center text-[#93A096] text-[10px] font-medium border border-dashed border-[rgba(238,234,224,0.06)]">
              Elevated privileges required to configure maintenance windows.
            </div>
          )}
        </div>

        {/* Telemetry Charts */}
        <MonitorCharts checks={checks} stats={stats} />

        {/* Probe Log */}
        <MonitorCheckLog workspaceId={workspaceId} monitorId={monitor.id} token={token} />

      </div>
    </main>
  );
}
