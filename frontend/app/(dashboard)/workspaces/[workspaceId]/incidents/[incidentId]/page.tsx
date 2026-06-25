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
      <main className="p-8 md:p-12 text-[#EEEAE0] min-h-screen">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <XCircle className="w-12 h-12 text-[#C2766B] mx-auto" />
          <h1 className="text-2xl font-medium text-[#93A096]">
            Incident Not Found
          </h1>
          <Link
            href={`/workspaces/${workspaceId}/incidents`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-xs font-medium text-[#93A096] hover:text-[#9FD8BD] transition-colors"
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
      `${API_URL}/api/v1/workspaces/${workspaceId}/monitors/${incident.monitorId}/checks?limit=25`,
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
      OPEN: "bg-[rgba(194,118,107,0.1)] text-[#C2766B] border-[#C2766B]/50 animate-pulse",
      ACKNOWLEDGED: "bg-[rgba(227,163,86,0.1)] text-[#E2A356] border-[#E2A356]/50",
      RESOLVED: "bg-[rgba(159,216,189,0.1)] text-[#9FD8BD] border-[#9FD8BD]/50",
    };
    return (
      <span className={`px-2 py-0.5 text-[9px] font-medium border ${styles[status] || styles.OPEN}`}>
        {status}
      </span>
    );
  };

  const CheckIcon = ({ status }: { status: string }) => {
    if (status === "UP") return <CheckCircle2 className="w-4 h-4 text-[#9FD8BD]" />;
    if (status === "DOWN") return <XCircle className="w-4 h-4 text-[#C2766B]" />;
    return <Activity className="w-4 h-4 text-[#E2A356]" />;
  };

  return (
    <main className="p-8 md:p-12 text-[#EEEAE0] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* BACK LINK */}
        <Link
          href={`/workspaces/${workspaceId}/incidents`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-xs font-medium text-[#93A096] hover:text-[#9FD8BD] hover:border-[#9FD8BD] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Incident Log
        </Link>

        {/* HEADER */}
        <div className="border-b border-[rgba(238,234,224,0.08)] pb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <AlertOctagon className={`w-8 h-8 ${isResolved ? "text-[#93A096]" : "text-[#C2766B]"}`} />
                <h1 className="text-3xl font-medium text-[#EEEAE0]">
                  Incident <span className={isResolved ? "text-[#93A096]" : "text-[#C2766B]"}>Report</span>
                </h1>
              </div>
              <p className="text-lg font-medium text-[#EEEAE0]">
                {incident.title}
              </p>
              <div className="flex items-center gap-3">
                <StatusBadge status={incident.status} />
                <span className="text-[10px] text-[#93A096] font-medium flex items-center gap-1">
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
          <div className="lg:col-span-2 p-6 bg-transparent border border-[rgba(238,234,224,0.06)]">
            <h3 className="text-xs font-medium text-[#93A096] mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#A3D1DF]" />
              Event Timeline
            </h3>

            <div className="space-y-0">
              {/* TRIAGED */}
              <div className="flex gap-4 pb-8 relative">
                <div className="flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full bg-[#C2766B] border-2 border-[#C2766B] z-10" />
                  <div className="w-0.5 flex-1 bg-[rgba(238,234,224,0.06)] mt-1" />
                </div>
                <div className="pt-0.5">
                  <p className="text-sm font-medium text-[#C2766B]">Breach Triaged</p>
                  <p className="text-xs text-[#93A096] mt-1">{new Date(incident.startedAt).toLocaleString()}</p>
                  <p className="text-[10px] text-[#93A096] mt-0.5">Monitor auto-detected failure threshold breached</p>
                </div>
              </div>

              {/* ACKNOWLEDGED */}
              <div className="flex gap-4 pb-8 relative">
                <div className="flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full border-2 z-10 ${
                    incident.status === "OPEN"
                      ? "bg-[rgba(238,234,224,0.04)] border-[rgba(238,234,224,0.06)]"
                      : "bg-[#E2A356] border-[#E2A356]"
                  }`} />
                  {incident.status !== "RESOLVED" && <div className="w-0.5 flex-1 bg-[rgba(238,234,224,0.06)] mt-1" />}
                </div>
                <div className="pt-0.5">
                  <p className={`text-sm font-medium ${
                    incident.status === "OPEN" ? "text-[#93A096]" : "text-[#E2A356]"
                  }`}>
                    Acknowledged
                  </p>
                  {incident.status === "OPEN" ? (
                    <p className="text-xs text-[#93A096] mt-1">Awaiting operator acknowledgment</p>
                  ) : (
                    <>
                      <p className="text-xs text-[#93A096] mt-1">{new Date(incident.startedAt).toLocaleString()}</p>
                      <p className="text-[10px] text-[#93A096] mt-0.5">Operator acknowledged the breach</p>
                    </>
                  )}
                </div>
              </div>

              {/* RESOLVED */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full border-2 z-10 ${
                    isResolved
                      ? "bg-[#9FD8BD] border-[#9FD8BD]"
                      : "bg-[rgba(238,234,224,0.04)] border-[rgba(238,234,224,0.06)]"
                  }`} />
                </div>
                <div className="pt-0.5">
                  <p className={`text-sm font-medium ${
                    isResolved ? "text-[#9FD8BD]" : "text-[#93A096]"
                  }`}>
                    Resolved
                  </p>
                  {isResolved && incident.resolvedAt ? (
                    <>
                      <p className="text-xs text-[#93A096] mt-1">{new Date(incident.resolvedAt).toLocaleString()}</p>
                      <p className="text-[10px] text-[#93A096] mt-0.5">Services restored to normal operation</p>
                    </>
                  ) : (
                    <p className="text-xs text-[#93A096] mt-1">Pending resolution</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MONITOR CONTEXT CARD */}
          <div className="p-6 bg-transparent border border-[rgba(238,234,224,0.06)] space-y-4">
            <h3 className="text-xs font-medium text-[#93A096] flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#9FD8BD]" />
              Monitor Context
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-[#93A096] font-medium">Target</p>
                <Link
                  href={`/workspaces/${workspaceId}/monitors/${incident.monitor.id}`}
                  className="text-sm font-medium text-[#A3D1DF] hover:text-[#A3D1DF] truncate block mt-1"
                >
                  {incident.monitor.name}
                </Link>
              </div>
              <div>
                <p className="text-[10px] text-[#93A096] font-medium">Endpoint</p>
                <p className="text-xs text-[#EEEAE0] mt-1 truncate">{incident.monitor.url}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#93A096] font-medium">Current Status</p>
                <span className={`inline-flex items-center gap-1.5 mt-1 px-2 py-1 text-[10px] font-medium border ${
                  incident.monitor.status === "UP"
                    ? "text-[#9FD8BD] border-[#9FD8BD]/50 bg-[rgba(159,216,189,0.1)]"
                    : incident.monitor.status === "DOWN"
                    ? "text-[#C2766B] border-[#C2766B]/50 bg-[rgba(194,118,107,0.1)]"
                    : "text-[#E2A356] border-[#E2A356]/50 bg-[rgba(227,163,86,0.1)]"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    incident.monitor.status === "UP" ? "bg-[#9FD8BD]" :
                    incident.monitor.status === "DOWN" ? "bg-[#C2766B]" : "bg-[#E2A356]"
                  }`} />
                  {incident.monitor.status}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-[#93A096] font-medium">Incident ID</p>
                <p className="text-xs text-[#93A096] mt-1">#{incident.id}</p>
              </div>
            </div>

            <Link
              href={`/workspaces/${workspaceId}/monitors/${incident.monitor.id}`}
              className="flex items-center justify-center gap-2 mt-4 px-4 py-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-xs font-medium text-[#93A096] hover:text-[#9FD8BD] hover:border-[#9FD8BD] transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              View Monitor Diagnostics
            </Link>
          </div>
        </div>

        {/* RECENT CHECKS DURING INCIDENT */}
        <div className="space-y-4">
          <h2 className="text-xs font-medium text-[#93A096] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#93A096]" />
            Recent Probe Results
          </h2>

          {checks.length === 0 ? (
            <div className="p-8 border border-dashed border-[rgba(238,234,224,0.06)] bg-transparent text-center text-[#93A096] text-xs font-medium">
              No probe data available for this period.
            </div>
          ) : (
            <div className="border border-[rgba(238,234,224,0.06)] bg-transparent overflow-x-auto">
              <div className="min-w-[600px] grid grid-cols-12 gap-4 px-6 py-4 border-b border-[rgba(238,234,224,0.06)] bg-[rgba(238,234,224,0.04)] text-[10px] font-medium text-[#93A096]">
                <div className="col-span-1">Status</div>
                <div className="col-span-3">Timestamp</div>
                <div className="col-span-2">Code</div>
                <div className="col-span-2">Latency</div>
                <div className="col-span-4">Message</div>
              </div>

              <div className="min-w-[600px] divide-y divide-[rgba(238,234,224,0.08)]">
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
                          ? "bg-[rgba(194,118,107,0.1)] hover:bg-[rgba(194,118,107,0.1)]"
                          : "hover:bg-[rgba(238,234,224,0.04)]"
                      }`}
                    >
                      <div className="col-span-1">
                        <CheckIcon status={check.status} />
                      </div>
                      <div className="col-span-3 text-xs text-[#93A096] font-medium">
                        {new Date(check.checkedAt).toLocaleString()}
                      </div>
                      <div className="col-span-2">
                        <span className={`text-[10px] font-medium px-2 py-0.5 border ${
                          check.status === "UP"
                            ? "text-[#9FD8BD] border-[#9FD8BD]/50 bg-[rgba(159,216,189,0.1)]"
                            : "text-[#C2766B] border-[#C2766B]/50 bg-[rgba(194,118,107,0.1)]"
                        }`}>
                          {check.statusCode ?? "N/A"}
                        </span>
                      </div>
                      <div className="col-span-2 text-xs text-[#93A096] font-medium">
                        {check.responseTimeMs != null ? `${check.responseTimeMs}ms` : "\u2014"}
                      </div>
                      <div className="col-span-4 text-xs text-[#93A096] truncate">
                        {check.errorMessage || "\u2014"}
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
