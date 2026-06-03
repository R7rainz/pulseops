import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  Clock,
  ServerCrash,
  TerminalSquare,
  Play,
  Pause,
  ExternalLink,
  Edit,
  Info,
  BarChart3,
  ListTree,
} from "lucide-react";
import {
  pauseMonitor,
  resumeMonitor,
  triggerCheck,
  updateMonitor,
} from "../actions";
import type { Monitor, MonitorCheck, MonitorStats } from "@/lib/types";
import ResponseTimeChart from "@/components/ResponseTimeChart";
import StatusPieChart from "@/components/StatusPieChart";

export default async function MonitorDetailsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; monitorId: string }>;
}) {
  const resolvedParams = await params;
  const { workspaceId, monitorId } = resolvedParams;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;

  if (!token) redirect("/login");

  let monitor: Monitor | null = null;
  let stats: MonitorStats | null = null;
  let checks: MonitorCheck[] = [];

  try {
    const listRes = await apiFetch(
      `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}/monitors`,
      { token, cookieStore, cache: "no-store" },
    );

    if (listRes.ok) {
      const listData = await listRes.json();
      const monitors: Monitor[] = listData.data || [];
      monitor = monitors.find((m) => m.id === Number(monitorId)) || null;
    }

    if (listRes.status === 401 || listRes.status === 403) {
      redirect("/login");
    }
  } catch (err) {
    console.error("Failed to fetch monitor info:", err);
  }

  try {
    const [statsRes, checksRes] = await Promise.all([
      apiFetch(`http://127.0.0.1:4000/api/v1/monitors/${monitorId}/stats`, {
        token,
        cookieStore,
        cache: "no-store",
      }),
      apiFetch(`http://127.0.0.1:4000/api/v1/monitors/${monitorId}/checks`, {
        token,
        cookieStore,
        cache: "no-store",
      }),
    ]);

    if (statsRes.ok) stats = (await statsRes.json()).data;
    if (checksRes.ok) {
      const checksJson = await checksRes.json();
      checks = Array.isArray(checksJson.data) ? checksJson.data : [];
    }
  } catch (err) {
    console.error("Failed to fetch monitor data:", err);
  }

  const formattedUptime = stats?.uptimePercentage != null
    ? Number(stats.uptimePercentage).toFixed(2)
    : "100.00";
  const formattedLatency = stats?.averageResponseTimeMs
    ? Number(stats.averageResponseTimeMs).toFixed(0)
    : "0";
  const downCount = stats?.downChecks || 0;

  return (
    <main className="p-8 md:p-12 font-mono text-zinc-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Navigation & Header */}
        <div>
          <Link
            href={`/workspaces/${workspaceId}/monitors`}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-400 hover:border-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Grid
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-zinc-900 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-widest uppercase text-zinc-100 flex items-center gap-3">
                <TerminalSquare className="w-8 h-8 text-cyan-400" />
                Diagnostics
              </h1>
              <p className="text-sm text-zinc-500 mt-2 uppercase tracking-widest font-bold">
                Target Node: {monitorId}
                {monitor && (
                  <span className="ml-2 text-emerald-400">| {monitor.name}</span>
                )}
              </p>
            </div>
            <div className="px-4 py-2 bg-emerald-500/10 border-2 border-emerald-500/50 text-xs font-bold text-emerald-400 uppercase tracking-widest">
              Live Telemetry
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {monitor && monitor.status !== "PAUSED" ? (
            <form action={pauseMonitor}>
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="monitorId" value={monitorId} />
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-yellow-400 hover:border-yellow-500 transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            </form>
          ) : (
            <form action={resumeMonitor}>
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="monitorId" value={monitorId} />
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-400 hover:border-emerald-500 transition-colors"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            </form>
          )}

          <form action={triggerCheck}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="monitorId" value={monitorId} />
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-cyan-400 hover:border-cyan-500 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Check Now
            </button>
          </form>
        </div>

        {/* Configuration Panel */}
        {monitor && (
          <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.05)]">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-zinc-500" />
              Configuration
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Method</span>
                <p className="text-zinc-100 mt-1">{monitor.method}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Interval</span>
                <p className="text-zinc-100 mt-1">{monitor.intervalSeconds}s</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Timeout</span>
                <p className="text-zinc-100 mt-1">{monitor.timeoutMs}ms</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Expected</span>
                <p className="text-zinc-100 mt-1">{monitor.expectedStatus}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active</span>
                <p className={`mt-1 ${monitor.isActive ? "text-emerald-400" : "text-zinc-500"}`}>
                  {monitor.isActive ? "YES" : "NO"}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Last Check</span>
                <p className="text-zinc-100 mt-1">
                  {monitor.lastCheckedAt
                    ? new Date(monitor.lastCheckedAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Created</span>
                <p className="text-zinc-100 mt-1">
                  {new Date(monitor.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Node ID</span>
                <p className="text-zinc-100 mt-1">#{monitor.id}</p>
              </div>
            </div>
          </div>
        )}

        {/* BRUTALIST STATS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.05)] relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Uptime
              </span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-extrabold text-zinc-100">
                {formattedUptime}
              </span>
              <span className="text-lg font-bold text-emerald-400">%</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest">
              {stats?.totalChecks || 0} total scans
            </div>
            {stats && <StatusPieChart stats={stats} />}
          </div>

          <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(34,211,238,0.05)] relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Avg Latency
              </span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-extrabold text-zinc-100">
                {formattedLatency}
              </span>
              <span className="text-lg font-bold text-cyan-400">MS</span>
            </div>
            <div className="flex gap-4 text-[10px] mt-2 uppercase tracking-widest">
              <span className="text-emerald-400">{stats?.upChecks || 0} UP</span>
              <span className="text-red-400">{stats?.downChecks || 0} DOWN</span>
            </div>
          </div>

          <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(248,113,113,0.05)] relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Failures
              </span>
              <ServerCrash className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-extrabold text-zinc-100">
                {downCount}
              </span>
              <span className="text-lg font-bold text-red-400">DOWN</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest">
              {stats?.totalChecks
                ? `${((downCount / stats.totalChecks) * 100).toFixed(1)}% failure rate`
                : "NO DATA"}
            </div>
          </div>

          <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(168,85,247,0.05)] relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Status
              </span>
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-5xl font-extrabold ${
                stats?.latestStatus === "UP"
                  ? "text-emerald-400"
                  : stats?.latestStatus === "DOWN"
                    ? "text-red-400"
                    : "text-zinc-100"
              }`}>
                {stats?.latestStatus ?? "N/A"}
              </span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest">
              Last: {monitor?.lastCheckedAt
                ? new Date(monitor.lastCheckedAt).toLocaleTimeString()
                : "Never"}
            </div>
          </div>
        </div>

        {/* Response Time Trend */}
        <div>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-zinc-500" />
            Response Time Trend
          </h3>
          <ResponseTimeChart checks={checks} />
        </div>

        {/* Edit Form */}
        {monitor && (
          <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.05)]">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Edit className="w-4 h-4 text-zinc-500" />
              Reconfigure Target
            </h3>
            <form action={updateMonitor} className="space-y-4">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="monitorId" value={monitorId} />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-name" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Designation</label>
                  <input id="edit-name" name="name" type="text" defaultValue={monitor.name}
                    className="w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-url" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target URL</label>
                  <input id="edit-url" name="url" type="url" defaultValue={monitor.url}
                    className="w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-intervalSeconds" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Interval (s)</label>
                  <input id="edit-intervalSeconds" name="intervalSeconds" type="number" min={30} defaultValue={monitor.intervalSeconds}
                    className="w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-method" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Method</label>
                  <select id="edit-method" name="method" defaultValue={monitor.method}
                    className="w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors">
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-timeoutMs" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Timeout (ms)</label>
                  <input id="edit-timeoutMs" name="timeoutMs" type="number" min={1000} max={30000} defaultValue={monitor.timeoutMs}
                    className="w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-expectedStatus" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Expected Code</label>
                  <input id="edit-expectedStatus" name="expectedStatus" type="number" min={100} max={500} defaultValue={monitor.expectedStatus}
                    className="w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
              </div>

              <button type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-widest py-2 px-5 border-2 border-transparent transition-all">
                Apply Changes
              </button>
            </form>
          </div>
        )}

        {/* Check History */}
        <div>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ListTree className="w-4 h-4 text-zinc-500" />
            Scan Log
            <span className="text-zinc-600 ml-auto">[{checks.length} records]</span>
          </h3>

          {checks.length > 0 && (
            <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.05)] mb-6">
              <div className="flex items-end h-16 w-full gap-[2px] bg-zinc-900 p-2 border-2 border-zinc-800">
                {[...checks].reverse().map((check, idx) => {
                  const rt = check.responseTimeMs || 0;
                  const h = Math.min(Math.max((rt / 1000) * 100, 10), 100);
                  return (
                    <div
                      key={check.id || idx}
                      title={`${rt}ms [HTTP ${check.statusCode ?? "ERR"}]`}
                      style={{ height: `${h}%` }}
                      className={`flex-1 transition-all ${
                        check.status === "UP"
                          ? "bg-emerald-500 hover:bg-emerald-400"
                          : "bg-red-500 hover:bg-red-400"
                      }`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-zinc-600 uppercase tracking-widest font-bold mt-1.5">
                <span>Earliest</span>
                <span>Latest</span>
              </div>
            </div>
          )}

          {checks.length > 0 ? (
            <div className="border-2 border-zinc-800 bg-zinc-950">
              <div className="px-6 py-4 border-b-2 border-zinc-800 bg-zinc-900 flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
                <span>Timestamp</span>
                <span className="w-48 text-right">Status / Code / Latency</span>
              </div>
              <div className="divide-y-2 divide-zinc-900 max-h-96 overflow-y-auto">
                {checks.map((check) => (
                  <div
                    key={check.id}
                    className="px-6 py-3 flex items-center justify-between hover:bg-zinc-900 transition-colors font-bold text-sm"
                  >
                    <div className="flex items-center gap-4 text-zinc-300">
                      <span className="text-zinc-500">
                        [{new Date(check.checkedAt).toLocaleString()}]
                      </span>
                      {check.errorMessage && (
                        <span className="text-red-400 text-[10px] max-w-[200px] truncate">
                          {check.errorMessage}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6">
                      <span className={`text-xs uppercase tracking-widest w-12 ${
                        check.status === "UP" ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {check.status}
                      </span>
                      <span className={`w-12 text-right ${
                        check.statusCode && check.statusCode >= 400 ? "text-red-400" : "text-emerald-400"
                      }`}>
                        {check.statusCode ?? "--"}
                      </span>
                      <span className="text-zinc-100 w-16 text-right">
                        {check.responseTimeMs != null ? `${check.responseTimeMs}ms` : "--"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-zinc-600 text-sm font-bold uppercase tracking-widest bg-zinc-950 border-2 border-zinc-800 p-6 text-center">
              No scan records found
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
