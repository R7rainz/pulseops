import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { acknowledgeIncident, resolveIncident } from "./actions";
import { AlertOctagon, CheckCircle2, ShieldAlert, ShieldCheck, Clock } from "lucide-react";

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

  try {
    const res = await apiFetch(
      `http://127.0.0.1:4000/api/v1/workspaces/${workspaceId}/incidents`,
      { token, cookieStore, cache: "no-store" }
    );

    incidentsStatus = res.status;

    if (res.ok) {
      const json = await res.json();
      incidents = json.data || [];
    }
  } catch (error) {
    console.error("Failed to load workspace incidents:", error);
  }

  if (incidentsStatus === 401 || incidentsStatus === 403) {
    redirect("/login");
  }

  const openTickets = incidents.filter(i => i.status !== "RESOLVED");
  const closedTickets = incidents.filter(i => i.status === "RESOLVED");

  return (
    <main className="p-8 md:p-12 font-mono text-zinc-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* HEADER BLOCK */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-zinc-900 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-widest uppercase text-zinc-100 flex items-center gap-3">
              <AlertOctagon className={`w-8 h-8 ${openTickets.length > 0 ? "text-red-500 animate-pulse" : "text-zinc-500"}`} />
              Incident <span className="text-red-500">Log</span>
            </h1>
            <p className="text-sm text-zinc-500 mt-2 uppercase tracking-widest font-bold">
              Breach Reporting & Triage Systems
            </p>
          </div>
          <div className="px-4 py-2 bg-zinc-950 border-2 border-zinc-800 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            Status: {openTickets.length > 0 ? (
              <span className="text-red-400 font-black">{openTickets.length} UNRESOLVED BREACHES</span>
            ) : (
              <span className="text-emerald-400 font-black">ALL SYSTEMS OPERATIONAL</span>
            )}
          </div>
        </div>

        {/* ACTIVE INCIDENTS PANEL */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" /> Active Fire-Drills
          </h2>

          {openTickets.length === 0 ? (
            <div className="p-8 border-2 border-zinc-900 bg-zinc-950/50 text-zinc-600 text-xs font-bold uppercase tracking-widest flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Zero unacknowledged breaches detected. Core secure.
            </div>
          ) : (
            <div className="border-2 border-zinc-800 bg-zinc-950 divide-y-2 divide-zinc-900">
              {openTickets.map((ticket) => (
                <div key={ticket.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors hover:bg-zinc-900/40">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase tracking-widest ${ticket.status === "OPEN"
                          ? "bg-red-950 text-red-400 border-red-800 animate-pulse"
                          : "bg-amber-950 text-amber-400 border-amber-800"
                        }`}>
                        {ticket.status}
                      </span>
                      <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest truncate">
                        {ticket.title}
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-500 truncate">
                      Monitor Context: <span className="text-zinc-400 font-bold">{ticket.monitor.name}</span> ({ticket.monitor.url})
                    </p>
                    <div className="text-[10px] text-zinc-600 font-bold flex items-center gap-1 uppercase">
                      <Clock className="w-3 h-3" /> Tripped at: {new Date(ticket.startedAt).toLocaleString()}
                    </div>
                  </div>

                  {/* CONTROL BUTTONS */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {ticket.status === "OPEN" && (
                      <form action={acknowledgeIncident}>
                        <input type="hidden" name="workspaceId" value={workspaceId} />
                        <input type="hidden" name="incidentId" value={ticket.id} />
                        <button type="submit" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 hover:border-amber-500 text-zinc-400 hover:text-amber-400 text-xs font-bold uppercase tracking-widest transition-colors rounded-none">
                          ACKNOWLEDGE
                        </button>
                      </form>
                    )}
                    <form action={resolveIncident}>
                      <input type="hidden" name="workspaceId" value={workspaceId} />
                      <input type="hidden" name="incidentId" value={ticket.id} />
                      <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 border-2 border-transparent text-zinc-950 text-xs font-bold uppercase tracking-widest transition-colors rounded-none">
                        MARK RESOLVED
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ARCHIVED / RESOLVED LOGS */}
        <div className="space-y-4 pt-4">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-zinc-600" /> Historical Resolutions
          </h2>

          {closedTickets.length === 0 ? (
            <div className="p-4 text-zinc-700 text-xs font-bold uppercase tracking-widest">
              No historical entries found in current ledger.
            </div>
          ) : (
            <div className="border-2 border-zinc-900 bg-zinc-950/40 divide-y-2 divide-zinc-900/60">
              {closedTickets.map((ticket) => (
                <div key={ticket.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-zinc-400 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold uppercase tracking-widest text-zinc-500 truncate">
                      {ticket.title}
                    </p>
                    <p className="text-[10px] text-zinc-600 truncate mt-0.5">
                      Target: {ticket.monitor.name}
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-zinc-600 font-bold uppercase flex-shrink-0">
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
