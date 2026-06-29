import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { redirect } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { IncidentActions } from "../incident-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { ArrowLeft, AlertOctagon, Clock, Radio, Eye, XCircle } from "lucide-react";

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
      <main className="grid min-h-dvh place-items-center p-12 text-center">
        <div>
          <XCircle className="mx-auto h-10 w-10 text-down" />
          <p className="mt-4 font-display text-lg font-medium text-foreground">Incident not found</p>
          <Link href={`/workspaces/${workspaceId}/incidents`} className="btn btn-ghost mt-5">
            <ArrowLeft className="h-4 w-4" /> Back to incidents
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

  return (
    <main className="min-h-dvh p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">

        <Link
          href={`/workspaces/${workspaceId}/incidents`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to incidents
        </Link>

        {/* HEADER */}
        <div className="glass flex flex-col justify-between gap-5 rounded-lg p-6 md:flex-row md:items-center">
          <div className="min-w-0 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <AlertOctagon className={cn("h-5 w-5", isResolved ? "text-muted-foreground" : "text-down")} />
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", INCIDENT_CHIP[incident.status])}>
                {incident.status.toLowerCase()}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" /> {duration}
              </span>
            </div>
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-foreground">{incident.title}</h1>
          </div>
          <IncidentActions incidentId={incident.id} workspaceId={workspaceId} status={incident.status} canEdit={canEdit} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* TIMELINE */}
          <section className="glass rounded-lg p-6 lg:col-span-2">
            <h3 className="mb-6 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4 text-info" /> Timeline
            </h3>
            <div className="space-y-0">
              <TimelineStep color="bg-down" connector title="Detected" active titleClass="text-down"
                time={new Date(incident.startedAt).toLocaleString()} note="Failure threshold breached automatically." />
              <TimelineStep
                color={incident.status === "OPEN" ? "bg-surface-raised" : "bg-degraded"}
                connector={incident.status !== "RESOLVED"}
                title="Acknowledged"
                active={incident.status !== "OPEN"}
                titleClass={incident.status === "OPEN" ? "text-muted-foreground" : "text-degraded"}
                time={incident.status === "OPEN" ? undefined : new Date(incident.startedAt).toLocaleString()}
                note={incident.status === "OPEN" ? "Awaiting acknowledgement." : "Acknowledged by an operator."}
              />
              <TimelineStep
                color={isResolved ? "bg-up" : "bg-surface-raised"}
                title="Resolved"
                active={isResolved}
                titleClass={isResolved ? "text-up" : "text-muted-foreground"}
                time={isResolved && incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : undefined}
                note={isResolved ? "Service restored to normal." : "Pending resolution."}
              />
            </div>
          </section>

          {/* MONITOR CONTEXT */}
          <section className="glass space-y-4 rounded-lg p-6">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
              <Radio className="h-4 w-4 text-up" /> Monitor
            </h3>
            <div className="space-y-3.5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Name</p>
                <Link href={`/workspaces/${workspaceId}/monitors/${incident.monitor.id}`} className="mt-1 block truncate text-sm font-medium text-info hover:underline">
                  {incident.monitor.name}
                </Link>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Endpoint</p>
                <p className="mt-1 truncate font-mono text-xs text-foreground">{incident.monitor.url}</p>
              </div>
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Current status</p>
                <StatusBadge status={incident.monitor.status} size="sm" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Incident</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">#{incident.id}</p>
              </div>
            </div>
            <Link href={`/workspaces/${workspaceId}/monitors/${incident.monitor.id}`} className="btn btn-ghost w-full">
              <Eye className="h-3.5 w-3.5" /> View monitor
            </Link>
          </section>
        </div>

        {/* RECENT CHECKS */}
        <section className="space-y-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Recent checks</h2>
          {checks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No check data for this period.
            </div>
          ) : (
            <div className="glass overflow-x-auto rounded-lg">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-left font-medium">Time</th>
                    <th className="px-5 py-3 text-left font-medium">Code</th>
                    <th className="px-5 py-3 text-left font-medium">Latency</th>
                    <th className="px-5 py-3 text-left font-medium">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {checks.map((check) => {
                    const checkedAt = new Date(check.checkedAt).getTime();
                    const startedAt = new Date(incident.startedAt).getTime();
                    const resolvedAt = incident.resolvedAt ? new Date(incident.resolvedAt).getTime() : Infinity;
                    const duringIncident = checkedAt >= startedAt && checkedAt <= resolvedAt;
                    return (
                      <tr key={check.id} className={cn("transition-colors", duringIncident ? "bg-down/[0.06]" : "hover:bg-surface-raised/50")}>
                        <td className="px-5 py-3"><StatusBadge status={check.status} size="sm" /></td>
                        <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted-foreground">{new Date(check.checkedAt).toLocaleString()}</td>
                        <td className="px-5 py-3 font-mono tabular-nums text-foreground">{check.statusCode ?? "—"}</td>
                        <td className="px-5 py-3 font-mono tabular-nums text-foreground">{check.responseTimeMs != null ? `${check.responseTimeMs}ms` : "—"}</td>
                        <td className="max-w-[200px] truncate px-5 py-3 text-muted-foreground">{check.errorMessage || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function TimelineStep({
  color,
  connector = false,
  title,
  titleClass,
  time,
  note,
}: {
  color: string;
  connector?: boolean;
  title: string;
  active?: boolean;
  titleClass?: string;
  time?: string;
  note?: string;
}) {
  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      <div className="flex flex-col items-center">
        <span className={cn("z-10 h-4 w-4 rounded-full ring-4 ring-surface", color)} />
        {connector && <span className="mt-1 w-px flex-1 bg-border" />}
      </div>
      <div className="pt-0">
        <p className={cn("text-sm font-medium", titleClass)}>{title}</p>
        {time && <p className="mt-0.5 font-mono text-xs text-muted-foreground">{time}</p>}
        {note && <p className="mt-0.5 text-xs text-muted-foreground/80">{note}</p>}
      </div>
    </div>
  );
}
