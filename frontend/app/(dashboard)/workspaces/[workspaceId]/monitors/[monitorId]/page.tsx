import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  Clock,
  ServerCrash,
  TerminalSquare,
} from "lucide-react";

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

  let stats: any = null;
  let checks: any[] = [];

  try {
    const [statsRes, checksRes] = await Promise.all([
      fetch(`http://127.0.0.1:4000/api/v1/monitors/${monitorId}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
      fetch(`http://127.0.0.1:4000/api/v1/monitors/${monitorId}/checks`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
    ]);

    if (statsRes.ok) stats = (await statsRes.json()).data;
    if (checksRes.ok) {
      const checksJson = await checksRes.json();
      checks = Array.isArray(checksJson.data)
        ? checksJson.data.slice(0, 40)
        : [];
    }
  } catch (err) {
    console.error("Failed to fetch monitor data:", err);
  }

  const formattedUptime = stats?.uptimePercentage
    ? Number(stats.uptimePercentage).toFixed(2)
    : "100.00";
  const formattedLatency = stats?.averageLatency
    ? Number(stats.averageLatency).toFixed(0)
    : "0";
  const incidentCount = stats?.totalIncidents || 0;

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
              </p>
            </div>
            <div className="px-4 py-2 bg-emerald-500/10 border-2 border-emerald-500/50 text-xs font-bold text-emerald-400 uppercase tracking-widest">
              Live Telemetry
            </div>
          </div>
        </div>

        {/* BRUTALIST STATS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.05)] relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Global Uptime
              </span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-extrabold text-zinc-100">
                {formattedUptime}
              </span>
              <span className="text-lg font-bold text-emerald-400">%</span>
            </div>
          </div>

          <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(34,211,238,0.05)] relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Avg Response
              </span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-extrabold text-zinc-100">
                {formattedLatency}
              </span>
              <span className="text-lg font-bold text-cyan-400">MS</span>
            </div>
          </div>

          <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(248,113,113,0.05)] relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Recorded Drops
              </span>
              <ServerCrash className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-extrabold text-zinc-100">
                {incidentCount}
              </span>
              <span className="text-lg font-bold text-red-400">ERR</span>
            </div>
          </div>
        </div>

        {/* SHARP HISTORY BAR */}
        <div className="p-8 bg-zinc-950 border-2 border-zinc-800">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 flex justify-between">
            <span>Ping Execution History</span>
            <span>[{checks.length} cycles]</span>
          </h3>

          {checks.length === 0 ? (
            <p className="text-zinc-600 text-sm font-bold uppercase tracking-widest bg-zinc-900 p-4 border-l-2 border-zinc-700">
              Awaiting cron execution block...
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-end h-16 w-full gap-[2px] bg-zinc-900 p-2 border-2 border-zinc-800">
                {[...checks].reverse().map((check, idx) => {
                  // Calculate dynamic height based on latency (max visual cap at ~1000ms)
                  const heightPercent = Math.min(
                    Math.max((check.responseTime / 1000) * 100, 10),
                    100,
                  );
                  return (
                    <div
                      key={check.id || idx}
                      title={`${check.responseTime}ms [HTTP ${check.statusCode}]`}
                      style={{ height: `${heightPercent}%` }}
                      className={`flex-1 transition-all ${
                        check.status === "UP"
                          ? "bg-emerald-500 hover:bg-emerald-400"
                          : "bg-red-500 hover:bg-red-400"
                      }`}
                    />
                  );
                })}
                {Array.from({ length: Math.max(0, 40 - checks.length) }).map(
                  (_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex-1 h-2 bg-zinc-800"
                    />
                  ),
                )}
              </div>
              <div className="flex justify-between text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                <span>T-Minus</span>
                <span>Current</span>
              </div>
            </div>
          )}
        </div>

        {/* TERMINAL LOG BLOCK */}
        {checks.length > 0 && (
          <div className="border-2 border-zinc-800 bg-zinc-950">
            <div className="px-6 py-4 border-b-2 border-zinc-800 bg-zinc-900 flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
              <span>Timestamp</span>
              <span className="text-right w-32">Status / MS</span>
            </div>
            <div className="divide-y-2 divide-zinc-900 max-h-96 overflow-y-auto custom-scrollbar">
              {checks.map((check) => (
                <div
                  key={check.id}
                  className="px-6 py-3 flex items-center justify-between hover:bg-zinc-900 transition-colors font-bold text-sm"
                >
                  <div className="flex items-center gap-4 text-zinc-300">
                    <span className="text-zinc-600">
                      [{new Date(check.createdAt).toLocaleTimeString()}]
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span
                      className={`text-xs uppercase tracking-widest ${check.statusCode >= 400 ? "text-red-400" : "text-emerald-400"}`}
                    >
                      HTTP {check.statusCode}
                    </span>
                    <span className="text-zinc-100 w-16 text-right">
                      {check.responseTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
