import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { redirect } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { AlertOctagon, CheckCircle2, ShieldAlert, ShieldCheck, Clock, ExternalLink } from "lucide-react";
import { IncidentActions } from "./incident-actions";

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
  };
}

export default async function IncidentsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const resolvedParams = await params;
  const workspaceId = resolvedParams.workspaceId;

  const cookieStore = await cookies();
  const token = cookieStore.get("pulseops_token")?.value;

  if (!token) redirect("/login");

  let incidents: Incident[] = [];
  let incidentsStatus: number | null = null;
  let role: string | null = null;

  try {
    const [incidentsRes, wsRes] = await Promise.all([
      apiFetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}/incidents`,
        { token, cookieStore, cache: "no-store" }
      ),
      apiFetch(
        `${API_URL}/api/v1/workspaces/${workspaceId}`,
        { token, cookieStore, cache: "no-store" }
      ),
    ]);

    incidentsStatus = incidentsRes.status;

    if (incidentsRes.ok) {
      const json = await incidentsRes.json();
      incidents = json.data || [];
    }

    if (wsRes.ok) {
      const wsData = await wsRes.json();
      role = wsData.data?.role ?? null;
    }
  } catch (error) {
    console.error("Failed to load workspace incidents:", error);
  }

  if (incidentsStatus === 401 || incidentsStatus === 403) {
    redirect("/login");
  }

  const canEdit = role === "OWNER" || role === "ADMIN";

  const openTickets = incidents.filter(i => i.status !== "RESOLVED");
  const closedTickets = incidents.filter(i => i.status === "RESOLVED");

  return (
    <main className="p-8 md:p-12 text-[#EEEAE0] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* HEADER BLOCK */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[rgba(238,234,224,0.08)] pb-6">
          <div>
            <h1 className="text-3xl font-medium text-[#EEEAE0] flex items-center gap-3">
              <AlertOctagon className={`w-8 h-8 ${openTickets.length > 0 ? "text-[#C2766B] animate-pulse" : "text-[#93A096]"}`} />
              Incident <span className="text-[#C2766B]">Log</span>
            </h1>
            <p className="text-sm text-[#93A096] mt-2">
              Breach Reporting and Triage Systems
            </p>
          </div>
          <div className="px-4 py-2 bg-transparent border border-[rgba(238,234,224,0.06)] text-xs font-medium flex items-center gap-2">
            Status: {openTickets.length > 0 ? (
              <span className="text-[#C2766B] font-medium">{openTickets.length} Unresolved Breaches</span>
            ) : (
              <span className="text-[#9FD8BD] font-medium">All Systems Operational</span>
            )}
          </div>
        </div>

        {/* ACTIVE INCIDENTS PANEL */}
        <div className="space-y-4">
          <h2 className="text-xs font-medium text-[#93A096] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#C2766B]" /> Active Fire-Drills
          </h2>

          {openTickets.length === 0 ? (
            <div className="p-8 border border-[rgba(238,234,224,0.08)] bg-transparent text-[#93A096] text-xs font-medium flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#9FD8BD]" /> Zero unacknowledged breaches detected. Core secure.
            </div>
          ) : (
            <div className="border border-[rgba(238,234,224,0.06)] bg-transparent divide-y divide-[rgba(238,234,224,0.08)]">
              {openTickets.map((ticket) => (
                  <div key={ticket.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors hover:bg-[rgba(238,234,224,0.04)]">
                  <Link
                    href={`/workspaces/${workspaceId}/incidents/${ticket.id}`}
                    className="space-y-2 min-w-0 flex-1 group"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-[9px] font-medium border ${ticket.status === "OPEN"
                          ? "bg-[rgba(194,118,107,0.1)] text-[#C2766B] border-[#C2766B]/50 animate-pulse"
                          : "bg-[rgba(227,163,86,0.1)] text-[#E2A356] border-[#E2A356]/50"
                        }`}>
                        {ticket.status}
                      </span>
                      <h3 className="text-sm font-medium text-[#EEEAE0] group-hover:text-[#9FD8BD] truncate flex items-center gap-2">
                        {ticket.title}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#93A096]" />
                      </h3>
                    </div>
                    <p className="text-xs text-[#93A096] truncate">
                      Monitor Context: <span className="text-[#EEEAE0] font-medium">{ticket.monitor.name}</span> ({ticket.monitor.url})
                    </p>
                    <div className="text-[10px] text-[#93A096] font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Tripped at: {new Date(ticket.startedAt).toLocaleString()}
                    </div>
                  </Link>

                  <IncidentActions
                    incidentId={ticket.id}
                    workspaceId={workspaceId}
                    status={ticket.status}
                    canEdit={canEdit}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ARCHIVED / RESOLVED LOGS */}
        <div className="space-y-4 pt-4">
          <h2 className="text-xs font-medium text-[#93A096] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#93A096]" /> Historical Resolutions
          </h2>

          {closedTickets.length === 0 ? (
            <div className="p-4 text-[#93A096] text-xs font-medium">
              No historical entries found in current ledger.
            </div>
          ) : (
            <div className="border border-[rgba(238,234,224,0.08)] bg-transparent divide-y divide-[rgba(238,234,224,0.08)]">
              {closedTickets.map((ticket) => (
                <div key={ticket.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[#93A096] text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-[#93A096] truncate">
                      {ticket.title}
                    </p>
                    <p className="text-[10px] text-[#93A096] truncate mt-0.5">
                      Target: {ticket.monitor.name}
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-[#93A096] font-medium flex-shrink-0">
                    <div>Cleared: {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleTimeString() : "N/A"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
