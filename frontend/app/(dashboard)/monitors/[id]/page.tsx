import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  Percent,
  Timer,
  Hash,
  AlertCircle,
} from "lucide-react";

export default async function MonitorDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("pulseops_token");

  if (!tokenCookie?.value) {
    redirect("/login");
  }

  const token = tokenCookie.value;
  let stats: any = null;
  let errorMsg = null;

  try {
    const res = await fetch(
      `http://127.0.0.1:4000/api/v1/monitors/${id}/stats`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );

    if (res.ok) {
      const rawJson = await res.json();
      // Adjusting this based on if Fastify wrapped it in a "data" object or not
      stats = rawJson.data || rawJson;
    } else {
      errorMsg = `Backend responded with status: ${res.status}`;
    }
  } catch (err) {
    errorMsg = "Failed to connect to the backend monitoring service.";
  }

  // Fallback values so the UI doesn't crash if stats are missing
  const safeStats = stats || {};
  const uptime = safeStats.uptimePercentage
    ? safeStats.uptimePercentage.toFixed(2)
    : "0.00";
  const avgPing = safeStats.averageResponseTimeMs
    ? Math.round(safeStats.averageResponseTimeMs)
    : 0;
  const total = safeStats.totalChecks || 0;
  const up = safeStats.upChecks || 0;
  const down = safeStats.downChecks || 0;
  const isHealthy = parseFloat(uptime) > 90;

  return (
    <main className="p-10 font-mono text-zinc-50">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="space-y-4">
          <Link
            href="/monitors"
            className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Monitors
          </Link>

          <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                <Activity className="w-6 h-6 text-zinc-200" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Monitor Diagnostics
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-zinc-500">Endpoint ID: {id}</p>
                  <span className="text-zinc-700">•</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${safeStats.latestStatus === "UP" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}
                  >
                    Current: {safeStats.latestStatus || "UNKNOWN"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {errorMsg ? (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            {errorMsg}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Uptime KPI */}
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl flex flex-col justify-between">
              <div className="flex items-center gap-2 text-zinc-400 mb-4">
                <Percent className="w-4 h-4" />
                <h3 className="text-sm font-medium">Uptime Percentage</h3>
              </div>
              <div>
                <span
                  className={`text-4xl font-bold ${isHealthy ? "text-emerald-400" : "text-red-400"}`}
                >
                  {uptime}%
                </span>
                <p className="text-xs text-zinc-500 mt-2">
                  Historical reliability score
                </p>
              </div>
            </div>

            {/* Response Time KPI */}
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl flex flex-col justify-between">
              <div className="flex items-center gap-2 text-zinc-400 mb-4">
                <Timer className="w-4 h-4" />
                <h3 className="text-sm font-medium">Average Response</h3>
              </div>
              <div>
                <span className="text-4xl font-bold text-zinc-100">
                  {avgPing}
                  <span className="text-2xl text-zinc-500 ml-1">ms</span>
                </span>
                <p className="text-xs text-zinc-500 mt-2">
                  Average server ping time
                </p>
              </div>
            </div>

            {/* Total Checks KPI */}
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl flex flex-col justify-between">
              <div className="flex items-center gap-2 text-zinc-400 mb-4">
                <Hash className="w-4 h-4" />
                <h3 className="text-sm font-medium">Total Pings Executed</h3>
              </div>
              <div>
                <span className="text-4xl font-bold text-zinc-100">
                  {total}
                </span>
                <p className="text-xs text-zinc-500 mt-2">
                  Lifelong requests sent
                </p>
              </div>
            </div>

            {/* Up/Down Ratio KPI */}
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl flex flex-col justify-between">
              <div className="flex items-center gap-2 text-zinc-400 mb-4">
                <AlertCircle className="w-4 h-4" />
                <h3 className="text-sm font-medium">Failure Ratio</h3>
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <span className="text-3xl font-bold text-emerald-400">
                    {up}
                  </span>
                  <span className="text-sm text-zinc-500 ml-2">UP</span>
                </div>
                <div className="pb-1 text-zinc-700">/</div>
                <div>
                  <span className="text-3xl font-bold text-red-400">
                    {down}
                  </span>
                  <span className="text-sm text-zinc-500 ml-2">DOWN</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
