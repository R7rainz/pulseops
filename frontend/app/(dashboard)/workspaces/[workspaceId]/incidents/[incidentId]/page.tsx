import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { redirect } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { IncidentActions } from "../incident-actions";
import {
  ArrowLeft,
  AlertOctagon,
  Clock,
  Radio,
  CheckCircle2,
  Eye,
  XCircle,
  Activity,
} from "lucide-react";

interface Incident {
  id: number;
  monitorId: number;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  title: string;
  startedAt: string;
  resolvedAt: string | null;
  monitor: {
    id: number;
    name: string;
    url: string;
    status: string;
    workspaceId: number;
  };
}

interface MonitorCheck {
  id: number;
  status: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
  checkedAt: string;
}

function formatDuration(startedAt: string, resolvedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
  const ms = end - start;
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; incidentId: string }>;
}) {
  const { workspaceId, incidentId } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;
  if (!token) redirect("/login");

  let incident: Incident | null = null;
  let checks: MonitorCheck[] = [];
  let role: string | null = null;

  try {
    const [incidentRes, wsRes] = await Promise.all([
      apiFetch(
        `${API_URL}/api/v1/incidents/${incidentId}`,
        { token, cookieStore, cache: "no-store" },
      ),
      apiFetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}`,
        { token, cookieStore, cache: "no-store" },
      ),
    ]);

    if (incidentRes.status === 401 || incidentRes.status === 403) redirect("/login");

    if (incidentRes.ok) {
      const json = await incidentRes.json();
      incident = json.data;
    }

    if (wsRes.ok) {
      const wsData = await wsRes.json();
      role = wsData.data?.role ?? null;
    }
  } catch (error) {
    console.error("Failed to load incident detail:", error);
  }

  if (!incident) {
    return (
      <main className="p-8 md:p-12 font-mono text-zinc-50 min-h-screen">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <XCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-2xl font-extrabold tracking-widest uppercase text-zinc-400">
            Incident Not Found
          </h1>
          <Link
            href={`/workspaces/${workspaceId}/incidents`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Incident Log
          </Link>
        </div>
      </main>
    );
  }

  const canEdit = role === "OWNER" || role === "ADMIN";
  const duration = formatDuration(incident.startedAt, incident.resolvedAt);
  const isResolved = incident.status === "RESOLVED";

  // Fetch checks for the associated monitor
  try {
    const checksRes = await apiFetch(
      `${API_URL}/api/v1/monitors/${incident.monitorId}/checks?limit=25`,
      { token, cookieStore, cache: "no-store" },
    );
    if (checksRes.ok) {
      const json = await checksRes.json();
      checks = json.data || [];
    }
  } catch {
    // non-critical
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      OPEN: "bg-red-950 text-red-400 border-red-800 animate-pulse",
      ACKNOWLEDGED: "bg-amber-950 text-amber-400 border-amber-800",
      RESOLVED: "bg-emerald-950 text-emerald-400 border-emerald-800",
    };
    return (
      <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase tracking-widest ${styles[status] || styles.OPEN}`}>
        {status}
      </span>
    );
  };

  const CheckIcon = ({ status }: { status: string }) => {
    if (status === "UP") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (status === "DOWN") return <XCircle className="w-4 h-4 text-red-400" />;
    return <Activity className="w-4 h-4 text-amber-400" />;
  };

  return (
    <main className="p-8 md:p-12 font-mono text-zinc-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* BACK LINK */}
        <Link
          href={`/workspaces/${workspaceId}/incidents`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-400 hover:border-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Incident Log
        </Link>

        {/* HEADER */}
        <div className="border-b-2 border-zinc-900 pb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <AlertOctagon className={`w-8 h-8 ${isResolved ? "text-zinc-500" : "text-red-500"}`} />
                <h1 className="text-3xl font-extrabold tracking-widest uppercase text-zinc-100">
                  Incident <span className={isResolved ? "text-zinc-400" : "text-red-500"}>Report</span>
                </h1>
              </div>
              <p className="text-lg font-bold text-zinc-200 uppercase tracking-widest">
                {incident.title}
              </p>
              <div className="flex items-center gap-3">
                <StatusBadge status={incident.status} />
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Duration: {duration}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <IncidentActions
                incidentId={incident.id}
                workspaceId={workspaceId}
                status={incident.status}
                canEdit={canEdit}
              />
            </div>
          </div>
        </div>

        {/* TIMELINE + MONITOR INFO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* TIMELINE */}
          <div className="lg:col-span-2 p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.05)]">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Event Timeline
            </h3>

            <div className="space-y-0">
              {/* TRIAGED */}
              <div className="flex gap-4 pb-8 relative">
                <div className="flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-red-400 z-10" />
                  <div className="w-0.5 flex-1 bg-zinc-800 mt-1" />
                </div>
                <div className="pt-0.5">
                  <p className="text-sm font-bold text-red-400 uppercase tracking-widest">Breach Triaged</p>
                  <p className="text-xs text-zinc-500 mt-1">{new Date(incident.startedAt).toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Monitor auto-detected failure threshold breached</p>
                </div>
              </div>

              {/* ACKNOWLEDGED */}
              <div className="flex gap-4 pb-8 relative">
                <div className="flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full border-2 z-10 ${
                    incident.status === "OPEN"
                      ? "bg-zinc-800 border-zinc-700"
                      : "bg-amber-500 border-amber-400"
                  }`} />
                  {incident.status !== "RESOLVED" && <div className="w-0.5 flex-1 bg-zinc-800 mt-1" />}
                </div>
                <div className="pt-0.5">
                  <p className={`text-sm font-bold uppercase tracking-widest ${
                    incident.status === "OPEN" ? "text-zinc-600" : "text-amber-400"
                  }`}>
                    Acknowledged
                  </p>
                  {incident.status === "OPEN" ? (
                    <p className="text-xs text-zinc-700 mt-1">Awaiting operator acknowledgment</p>
                  ) : (
                    <>
                      <p className="text-xs text-zinc-500 mt-1">{new Date(incident.startedAt).toLocaleString()}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Operator acknowledged the breach</p>
                    </>
                  )}
                </div>
              </div>

              {/* RESOLVED */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full border-2 z-10 ${
                    isResolved
                      ? "bg-emerald-500 border-emerald-400"
                      : "bg-zinc-800 border-zinc-700"
                  }`} />
                </div>
                <div className="pt-0.5">
                  <p className={`text-sm font-bold uppercase tracking-widest ${
                    isResolved ? "text-emerald-400" : "text-zinc-600"
                  }`}>
                    Resolved
                  </p>
                  {isResolved && incident.resolvedAt ? (
                    <>
                      <p className="text-xs text-zinc-500 mt-1">{new Date(incident.resolvedAt).toLocaleString()}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Services restored to normal operation</p>
                    </>
                  ) : (
                    <p className="text-xs text-zinc-700 mt-1">Pending resolution</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MONITOR CONTEXT CARD */}
          <div className="p-6 bg-zinc-950 border-2 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(52,211,153,0.05)] space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-500" />
              Monitor Context
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Target</p>
                <Link
                  href={`/workspaces/${workspaceId}/monitors/${incident.monitor.id}`}
                  className="text-sm font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider truncate block mt-1"
                >
                  {incident.monitor.name}
                </Link>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Endpoint</p>
                <p className="text-xs text-zinc-300 mt-1 truncate font-mono">{incident.monitor.url}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Current Status</p>
                <span className={`inline-flex items-center gap-1.5 mt-1 px-2 py-1 text-[10px] font-bold border uppercase tracking-widest ${
                  incident.monitor.status === "UP"
                    ? "text-emerald-400 border-emerald-800 bg-emerald-950/20"
                    : incident.monitor.status === "DOWN"
                    ? "text-red-400 border-red-800 bg-red-950/20"
                    : "text-amber-400 border-amber-800 bg-amber-950/20"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    incident.monitor.status === "UP" ? "bg-emerald-400" :
                    incident.monitor.status === "DOWN" ? "bg-red-400" : "bg-amber-400"
                  }`} />
                  {incident.monitor.status}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Incident ID</p>
                <p className="text-xs text-zinc-500 mt-1 font-mono">#{incident.id}</p>
              </div>
            </div>

            <Link
              href={`/workspaces/${workspaceId}/monitors/${incident.monitor.id}`}
              className="flex items-center justify-center gap-2 mt-4 px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-400 hover:border-emerald-400 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              View Monitor Diagnostics
            </Link>
          </div>
        </div>

        {/* RECENT CHECKS DURING INCIDENT */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-500" />
            Recent Probe Results
          </h2>

          {checks.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-zinc-800 bg-zinc-950 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest">
              No probe data available for this period.
            </div>
          ) : (
            <div className="border-2 border-zinc-800 bg-zinc-950 overflow-x-auto">
              <div className="min-w-[600px] grid grid-cols-12 gap-4 px-6 py-4 border-b-2 border-zinc-800 bg-zinc-900 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <div className="col-span-1">Status</div>
                <div className="col-span-3">Timestamp</div>
                <div className="col-span-2">Code</div>
                <div className="col-span-2">Latency</div>
                <div className="col-span-4">Message</div>
              </div>

              <div className="min-w-[600px] divide-y-2 divide-zinc-900">
                {checks.map((check) => {
                  const checkedAt = new Date(check.checkedAt).getTime();
                  const startedAt = new Date(incident.startedAt).getTime();
                  const resolvedAt = incident.resolvedAt
                    ? new Date(incident.resolvedAt).getTime()
                    : Infinity;
                  const duringIncident = checkedAt >= startedAt && checkedAt <= resolvedAt;

                  return (
                    <div
                      key={check.id}
                      className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors ${
                        duringIncident
                          ? "bg-red-950/10 hover:bg-red-950/20"
                          : "hover:bg-zinc-900/50"
                      }`}
                    >
                      <div className="col-span-1">
                        <CheckIcon status={check.status} />
                      </div>
                      <div className="col-span-3 text-xs text-zinc-400 font-bold">
                        {new Date(check.checkedAt).toLocaleString()}
                      </div>
                      <div className="col-span-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 border ${
                          check.status === "UP"
                            ? "text-emerald-400 border-emerald-800 bg-emerald-950/20"
                            : "text-red-400 border-red-800 bg-red-950/20"
                        }`}>
                          {check.statusCode ?? "N/A"}
                        </span>
                      </div>
                      <div className="col-span-2 text-xs text-zinc-500 font-bold">
                        {check.responseTimeMs != null ? `${check.responseTimeMs}ms` : "—"}
                      </div>
                      <div className="col-span-4 text-xs text-zinc-500 truncate">
                        {check.errorMessage || "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
