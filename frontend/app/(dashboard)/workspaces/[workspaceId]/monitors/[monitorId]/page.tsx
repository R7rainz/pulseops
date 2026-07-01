import { cookies } from "next/headers";
import { API_URL } from "@/lib/constants";
import { redirect } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import type { MonitorCheck, MonitorStats } from "@/lib/types";
import MonitorCharts from "@/components/MonitorCharts";
import MonitorCheckLog from "@/components/MonitorCheckLog";
import { scheduleMaintenance } from "../actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { statusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";
import { ArrowLeft, Settings2, Lock, ShieldCheck, ShieldAlert, Wrench, HeartPulse } from "lucide-react";
import HeartbeatSetup from "./heartbeat-setup";

interface MonitorDiag {
  id: number;
  name: string;
  type: "HTTP" | "HEARTBEAT";
  url: string;
  method: string;
  status: "UP" | "DOWN" | "PAUSED" | "DEGRADED";
  intervalSeconds: number;
  gracePeriodSeconds: number;
  consecutiveFailures: number;
  graceThreshold: number;
  tlsIssuer: string | null;
  tlsValidTo: string | null;
  tlsDaysRemaining: number | null;
  lastCheckedAt: string | null;
  lastHeartbeatAt: string | null;
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
      <main className="grid min-h-dvh place-items-center p-12 text-center">
        <div>
          <p className="font-display text-lg font-medium text-foreground">Monitor not found</p>
          <p className="mt-1 text-sm text-muted-foreground">It may have been deleted, or you don’t have access.</p>
          <Link href={`/workspaces/${workspaceId}/monitors`} className="btn btn-ghost mt-5">
            <ArrowLeft className="h-4 w-4" /> Back to monitors
          </Link>
        </div>
      </main>
    );
  }

  const meta = statusMeta(monitor.status);
  const StatusIcon = meta.icon;
  const isSslExpiring = monitor.tlsDaysRemaining !== null && monitor.tlsDaysRemaining <= 7;
  const uptime = analytics ? Number(analytics.uptime30Day) : null;
  const isHeartbeat = monitor.type === "HEARTBEAT";
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || API_URL;
  const pingUrl = `${publicApiUrl}/api/v1/monitors/${monitor.id}/heartbeat`;

  return (
    <main className="min-h-dvh p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">

        <Link
          href={`/workspaces/${workspaceId}/monitors`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to monitors
        </Link>

        {/* HEADER */}
        <div className="glass flex flex-col justify-between gap-5 rounded-lg p-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-lg border", meta.bg, meta.border)}>
              <StatusIcon className={cn("h-7 w-7", meta.text, monitor.status === "DOWN" && "animate-pulse")} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-foreground">{monitor.name}</h1>
              {isHeartbeat ? (
                <p className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-sm text-muted-foreground">
                  <HeartPulse className="h-3.5 w-3.5 text-primary" /> Heartbeat · expects a ping every {monitor.intervalSeconds}s
                </p>
              ) : (
                <p className="mt-0.5 truncate font-mono text-sm text-muted-foreground">{monitor.url}</p>
              )}
            </div>
          </div>
          <StatusBadge status={monitor.status} />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* CONFIG */}
          <section className="glass rounded-lg p-6">
            <h2 className="mb-4 flex items-center gap-2 border-b border-border pb-3 font-display text-sm font-semibold text-foreground">
              <Settings2 className="h-4 w-4 text-info" /> Configuration
            </h2>
            {isHeartbeat ? (
              <dl className="grid grid-cols-2 gap-4">
                <Detail label="Type" value="Heartbeat" />
                <Detail label="Expected every" value={`${monitor.intervalSeconds}s`} />
                <Detail label="Grace period" value={`${monitor.gracePeriodSeconds}s`} />
                <Detail
                  label="Last heartbeat"
                  value={monitor.lastHeartbeatAt ? new Date(monitor.lastHeartbeatAt).toLocaleTimeString() : "Never"}
                />
              </dl>
            ) : (
              <dl className="grid grid-cols-2 gap-4">
                <Detail label="Method" value={monitor.method} />
                <Detail label="Interval" value={`${monitor.intervalSeconds}s`} />
                <Detail label="Failures" value={`${monitor.consecutiveFailures} / ${monitor.graceThreshold}`} />
                <Detail
                  label="Last check"
                  value={monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleTimeString() : "Pending…"}
                />
              </dl>
            )}
          </section>

          {/* TLS (HTTP) / HEARTBEAT SETUP */}
          {isHeartbeat ? (
            <HeartbeatSetup
              workspaceId={workspaceId}
              pingUrl={pingUrl}
              intervalSeconds={monitor.intervalSeconds}
              gracePeriodSeconds={monitor.gracePeriodSeconds}
              lastHeartbeatAt={monitor.lastHeartbeatAt}
            />
          ) : (
          <section className={cn("glass rounded-lg p-6", isSslExpiring && "border-degraded/40")}>
            <h2 className="mb-4 flex items-center gap-2 border-b border-border pb-3 font-display text-sm font-semibold text-foreground">
              <Lock className={cn("h-4 w-4", isSslExpiring ? "text-degraded" : "text-up")} /> TLS certificate
            </h2>

            {planTier !== "PRO" && monitor.tlsIssuer ? (
              <div className="space-y-3 py-6 text-center">
                <ShieldAlert className="mx-auto h-8 w-8 text-degraded" />
                <p className="text-sm font-medium text-degraded">Pro plan required</p>
                <p className="text-xs text-muted-foreground">SSL/TLS monitoring is available on the Pro plan.</p>
                <Link href={`/workspaces/${workspaceId}/billing`} className="btn btn-accent mt-1 text-degraded border-degraded/40 bg-degraded/10">
                  Upgrade to Pro
                </Link>
              </div>
            ) : monitor.tlsIssuer ? (
              <div className="space-y-4">
                <Detail label="Issuer" value={monitor.tlsIssuer} truncate />
                <div className="flex items-end justify-between border-t border-border pt-4">
                  <Detail
                    label="Expires"
                    value={monitor.tlsValidTo ? new Date(monitor.tlsValidTo).toLocaleDateString() : "Unknown"}
                  />
                  <div className="text-right">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Days left</dt>
                    <dd className={cn("mt-1 flex items-center gap-1.5 text-sm font-semibold", isSslExpiring ? "text-degraded" : "text-up")}>
                      {isSslExpiring ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      {monitor.tlsDaysRemaining}
                    </dd>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">No TLS certificate — plain HTTP endpoint.</div>
            )}
          </section>
          )}
        </div>

        {/* 30-DAY SLA */}
        {analytics && (
          <section className="glass rounded-lg p-6">
            <h2 className="mb-5 border-b border-border pb-3 font-display text-sm font-semibold text-foreground">Last 30 days</h2>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              <Stat
                label="Uptime"
                value={`${analytics.uptime30Day}%`}
                className={uptime !== null && uptime >= 99.9 ? "text-up" : uptime !== null && uptime >= 99 ? "text-degraded" : "text-down"}
                big
              />
              <Stat label="Outages" value={`${analytics.totalOutages30Day}`} unit="events" />
              <Stat label="Downtime" value={`${analytics.downtimeMinutes30Day}`} unit="min" />
              <Stat label="Avg latency (24h)" value={`${analytics.avgLatency24h}`} unit="ms" className="text-info" />
            </div>
          </section>
        )}

        {/* MAINTENANCE */}
        <section className="glass rounded-lg p-6">
          <h2 className="mb-4 flex items-center gap-2 border-b border-border pb-3 font-display text-sm font-semibold text-foreground">
            <Wrench className="h-4 w-4 text-degraded" /> Scheduled maintenance
          </h2>

          {canEdit ? (
            <form action={scheduleMaintenance} className="space-y-4">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="monitorId" value={monitor.id} />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="maintenanceStartAt" className="block text-sm font-medium text-foreground">Start</label>
                  <input
                    id="maintenanceStartAt"
                    name="maintenanceStartAt"
                    type="datetime-local"
                    defaultValue={monitor.maintenanceStartAt ? new Date(monitor.maintenanceStartAt).toISOString().slice(0, 16) : ""}
                    className="field font-mono [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="maintenanceEndAt" className="block text-sm font-medium text-foreground">End</label>
                  <input
                    id="maintenanceEndAt"
                    name="maintenanceEndAt"
                    type="datetime-local"
                    defaultValue={monitor.maintenanceEndAt ? new Date(monitor.maintenanceEndAt).toISOString().slice(0, 16) : ""}
                    className="field font-mono [color-scheme:dark]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button type="submit" className="btn btn-accent text-degraded border-degraded/40 bg-degraded/10">
                  Schedule
                </button>
                {monitor.maintenanceStartAt && (
                  <button type="submit" name="clear" value="true" className="btn btn-ghost">
                    Clear window
                  </button>
                )}
              </div>
              {monitor.maintenanceStartAt && (
                <p className="border-t border-border pt-3 font-mono text-xs text-muted-foreground">
                  Current window: {new Date(monitor.maintenanceStartAt).toLocaleString()} — {new Date(monitor.maintenanceEndAt!).toLocaleString()}
                </p>
              )}
            </form>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              You need admin access to configure maintenance windows.
            </div>
          )}
        </section>

        {/* CHARTS */}
        <MonitorCharts checks={checks} stats={stats} isHeartbeat={isHeartbeat} />

        {/* CHECK LOG */}
        <MonitorCheckLog workspaceId={workspaceId} monitorId={monitor.id} token={token} />
      </div>
    </main>
  );
}

function Detail({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 text-sm text-foreground", truncate && "truncate")}>{value}</dd>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  className,
  big,
}: {
  label: string;
  value: string;
  unit?: string;
  className?: string;
  big?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <span className={cn("font-display font-semibold tabular-nums", big ? "text-3xl" : "text-2xl", className ?? "text-foreground")}>
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
      </span>
    </div>
  );
}
