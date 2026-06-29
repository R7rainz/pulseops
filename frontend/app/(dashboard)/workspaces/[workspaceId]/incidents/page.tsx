import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { redirect } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { IncidentActions } from "./incident-actions";

const INCIDENT_CHIP: Record<string, string> = {
  OPEN: "border-down/30 bg-down/10 text-down",
  ACKNOWLEDGED: "border-degraded/30 bg-degraded/10 text-degraded",
  RESOLVED: "border-up/30 bg-up/10 text-up",
};

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
    <main className="min-h-dvh p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Incidents</h1>
            <p className="mt-1 text-sm text-muted-foreground">Outages and degradations, triaged</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-sm font-medium",
              openTickets.length > 0 ? "border-down/30 bg-down/10 text-down" : "border-up/30 bg-up/10 text-up",
            )}
          >
            {openTickets.length > 0 ? (
              <>{openTickets.length} unresolved</>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> All clear
              </>
            )}
          </span>
        </div>

        {/* ACTIVE */}
        <section className="space-y-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Active</h2>
          {openTickets.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-up" /> No active incidents.
            </div>
          ) : (
            <div className="glass divide-y divide-border overflow-hidden rounded-lg">
              {openTickets.map((ticket) => (
                <div key={ticket.id} className="flex flex-col justify-between gap-4 p-5 transition-colors hover:bg-surface-raised/40 md:flex-row md:items-center">
                  <Link href={`/workspaces/${workspaceId}/incidents/${ticket.id}`} className="group min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", INCIDENT_CHIP[ticket.status])}>
                        {ticket.status.toLowerCase()}
                      </span>
                      <h3 className="flex items-center gap-1.5 truncate font-display text-sm font-medium text-foreground group-hover:text-up">
                        {ticket.title}
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </h3>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {ticket.monitor.name} · <span className="font-mono">{ticket.monitor.url}</span>
                    </p>
                    <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> Started {new Date(ticket.startedAt).toLocaleString()}
                    </p>
                  </Link>
                  <IncidentActions incidentId={ticket.id} workspaceId={workspaceId} status={ticket.status} canEdit={canEdit} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RESOLVED */}
        <section className="space-y-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Resolved</h2>
          {closedTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No resolved incidents yet.</p>
          ) : (
            <div className="glass divide-y divide-border overflow-hidden rounded-lg">
              {closedTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/workspaces/${workspaceId}/incidents/${ticket.id}`}
                  className="flex flex-col justify-between gap-2 p-4 transition-colors hover:bg-surface-raised/40 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground/80">{ticket.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{ticket.monitor.name}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    Resolved {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString() : "—"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
