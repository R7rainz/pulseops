import type { Monitor } from "../../generated/prisma/client";
import { prisma } from "../../lib/db";
import { redis } from "../../lib/redis";
import { sendWebhookNotifications } from "../webhooks/webhook.delivery";
import { inspectSslCertificate } from "./tls.inspector";

export type PingResult = {
  isUp: boolean;
  statusCode: number;
  latencyMs: number;
  tlsIssuer: string | null;
  tlsValidTo: Date | null;
  tlsDaysRemaining: number | null;
};

// Performs the actual network work for a single monitor. Used by the
// synchronous "check now" path. Automatic periodic checks instead go through
// the Go ping-engine (workers/ping-engine) via Kafka — see monitor.scheduler.ts
// and modules/telemetry/metrics.consumer.ts — and land on applyCheckResult
// directly with a PingResult built from that engine's output.
export async function performPing(monitor: Monitor): Promise<PingResult> {
  const startTime = performance.now();
  let isUp = false;
  let statusCode = 0;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      monitor.timeoutMs,
    );

    const response = await fetch(monitor.url, {
      signal: controller.signal,
      method: monitor.method,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    statusCode = response.status;
    isUp = statusCode === monitor.expectedStatus;
  } catch (error) {
    isUp = false;
    statusCode = 500;
  }

  const latencyMs = Math.round(performance.now() - startTime);

  const sslData = await inspectSslCertificate(monitor.url);

  return {
    isUp,
    statusCode,
    latencyMs,
    tlsIssuer: sslData?.issuer ?? null,
    tlsValidTo: sslData?.validTo ?? null,
    tlsDaysRemaining: sslData?.daysRemaining ?? null,
  };
}

// Applies a ping outcome to a monitor: maintenance-window suppression, the
// UP/DOWN/DEGRADED state machine, the MonitorCheck/Monitor/Incident
// transaction, Redis live-state, and webhook notifications. Shared by both
// the on-demand check path and the Kafka metrics consumer.
export async function applyCheckResult(monitor: Monitor, pingResult: PingResult) {
  const { isUp: currentAttemptUp, statusCode, latencyMs, tlsIssuer, tlsValidTo, tlsDaysRemaining } = pingResult;
  const isSslFailing = tlsDaysRemaining !== null && tlsDaysRemaining <= 7;

  const now = new Date();
  const isUnderMaintenance =
    monitor.maintenanceStartAt &&
    monitor.maintenanceEndAt &&
    now >= monitor.maintenanceStartAt &&
    now <= monitor.maintenanceEndAt;

  let targetStatus = monitor.status;
  let updatedFailures = monitor.consecutiveFailures;
  let newlyTriggeredIncident = false;
  let activeIncidentsToResolve: any[] = [];

  let incidentTitle = `Node Offline: HTTP ${statusCode} threshold breached`;

  // State Machine Logic (factoring in SSL)
  if (currentAttemptUp && !isSslFailing) {
    updatedFailures = 0;
    targetStatus = "UP";

    if (monitor.status === "DOWN" || monitor.status === "DEGRADED") {
      activeIncidentsToResolve = await prisma.incident.findMany({
        where: {
          monitorId: monitor.id,
          status: { in: ["OPEN", "ACKNOWLEDGED"] },
        },
      });
    }
  } else {
    updatedFailures += 1;

    if (updatedFailures >= monitor.graceThreshold) {
      targetStatus = isSslFailing && currentAttemptUp ? "DEGRADED" : "DOWN";

      const crossedThreshold = monitor.status !== targetStatus && updatedFailures === monitor.graceThreshold;

      // Suppress incident trigger if under maintenance
      if (crossedThreshold && !isUnderMaintenance) {
        newlyTriggeredIncident = true;
        if (isSslFailing && currentAttemptUp) {
          incidentTitle = `SSL/TLS Degradation: Certificate expires in ${tlsDaysRemaining} days`;
        }
      }
    }
  }

  // Force PAUSED status in UI during maintenance
  if (isUnderMaintenance) {
    targetStatus = "PAUSED";
  }

  // Build Atomic DB Transaction
  const transactionQueries: any[] = [
    prisma.monitorCheck.create({
      data: {
        monitorId: monitor.id,
        status: targetStatus === "DEGRADED" ? "DEGRADED" : (currentAttemptUp ? "UP" : "DOWN"),
        statusCode: statusCode,
        responseTimeMs: latencyMs,
      },
    }),
    prisma.monitor.update({
      where: { id: monitor.id },
      data: {
        status: targetStatus,
        consecutiveFailures: updatedFailures,
        lastCheckedAt: new Date(),
        // Persist the latest latency/status so the UI can show last-known
        // stats even after the 5-minute Redis live cache expires.
        lastResponseTime: latencyMs,
        lastStatusCode: statusCode,
        tlsIssuer,
        tlsValidTo,
        tlsDaysRemaining,
      },
    }),
  ];

  if (newlyTriggeredIncident) {
    transactionQueries.push(
      prisma.incident.create({
        data: {
          monitorId: monitor.id,
          status: "OPEN",
          title: incidentTitle,
        },
      })
    );
  }

  if (activeIncidentsToResolve.length > 0) {
    transactionQueries.push(
      prisma.incident.updateMany({
        where: {
          monitorId: monitor.id,
          status: { in: ["OPEN", "ACKNOWLEDGED"] },
        },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
        },
      })
    );
  }

  const txResults = await prisma.$transaction(transactionQueries);

  // Write live state to Redis for the live-monitors endpoint
  const liveState = {
    status: targetStatus,
    latency: latencyMs,
    statusCode,
    lastChecked: new Date().toISOString(),
  };
  redis
    .set(`monitor:${monitor.id}:live`, JSON.stringify(liveState), "EX", 300)
    .catch((err: any) => console.error("[ENGINE] Redis live write failed:", err));

  // Blast Webhooks
  if (newlyTriggeredIncident) {
    const createdIncident = txResults[2];

    sendWebhookNotifications(monitor.workspaceId, {
      event: "incident.opened",
      incidentId: createdIncident.id,
      monitorId: monitor.id,
      workspaceId: monitor.workspaceId,
      message: `CRITICAL ALERT: Monitor [${monitor.name}] flagged as ${targetStatus}. Target URL: ${monitor.url}`,
      timestamp: new Date().toISOString(),
    }).catch(err => console.error("[ENGINE] Webhook open failed:", err));
  }

  if (activeIncidentsToResolve.length > 0) {
    activeIncidentsToResolve.forEach(incident => {
      sendWebhookNotifications(monitor.workspaceId, {
        event: "incident.resolved",
        incidentId: incident.id,
        monitorId: monitor.id,
        workspaceId: monitor.workspaceId,
        message: `RECOVERY: Monitor [${monitor.name}] stabilized. All clear.`,
        timestamp: new Date().toISOString(),
      }).catch(err => console.error("[ENGINE] Webhook resolve failed:", err));
    });
  }

  return txResults[0];
}

// Convenience wrapper for the on-demand "check now" path: ping locally and
// apply the result synchronously, without going through Kafka.
export async function checkMonitor(monitor: Monitor) {
  const pingResult = await performPing(monitor);
  return applyCheckResult(monitor, pingResult);
}

// ---------------------------------------------------------------------------
// Heartbeat (push) monitors
//
// Unlike HTTP monitors — which PulseOps actively pings — a heartbeat monitor
// waits for the target to check in. The target POSTs to /monitors/:id/heartbeat
// at least every `intervalSeconds`. If a beat fails to arrive within
// `intervalSeconds + gracePeriodSeconds`, the monitor is considered DOWN.
// ---------------------------------------------------------------------------

// The instant a heartbeat monitor is considered overdue. Before any beat has
// been received we measure from createdAt, so a monitor that never checks in
// still flips DOWN once its first window elapses.
export function heartbeatDeadline(monitor: Monitor): Date {
  const baseline = monitor.lastHeartbeatAt ?? monitor.createdAt;
  return new Date(
    baseline.getTime() + (monitor.intervalSeconds + monitor.gracePeriodSeconds) * 1000,
  );
}

export function isHeartbeatOverdue(monitor: Monitor, now = new Date()): boolean {
  return now.getTime() > heartbeatDeadline(monitor).getTime();
}

// A beat arrived: record it and run it through the shared state machine as an
// UP result. This resets consecutiveFailures, resolves any open incident, fires
// the incident.resolved webhook, and updates Redis live-state — exactly like a
// successful HTTP check.
export async function recordHeartbeat(monitor: Monitor) {
  const now = new Date();

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: { lastHeartbeatAt: now },
  });

  return applyCheckResult(
    { ...monitor, lastHeartbeatAt: now },
    {
      isUp: true,
      statusCode: 200,
      latencyMs: 0,
      tlsIssuer: monitor.tlsIssuer,
      tlsValidTo: monitor.tlsValidTo,
      tlsDaysRemaining: monitor.tlsDaysRemaining,
    },
  );
}

// A beat is overdue: transition the monitor to DOWN and open an incident. This
// is time-based rather than counter-based (there are no "attempts" to count for
// a push monitor), so it mirrors the incident-open branch of applyCheckResult
// rather than reusing its grace-threshold logic. Idempotent: a monitor already
// DOWN is left untouched, so the sweep won't open duplicate incidents.
export async function applyHeartbeatMiss(monitor: Monitor) {
  const now = new Date();

  const isUnderMaintenance =
    monitor.maintenanceStartAt &&
    monitor.maintenanceEndAt &&
    now >= monitor.maintenanceStartAt &&
    now <= monitor.maintenanceEndAt;

  // During a maintenance window we suppress incidents and just hold PAUSED.
  if (isUnderMaintenance) {
    if (monitor.status !== "PAUSED") {
      await prisma.monitor.update({
        where: { id: monitor.id },
        data: { status: "PAUSED", lastCheckedAt: now },
      });
    }
    return;
  }

  // Already flagged — nothing to do (avoids duplicate incidents each sweep).
  if (monitor.status === "DOWN") return;

  const overdueSeconds = Math.round((now.getTime() - heartbeatDeadline(monitor).getTime()) / 1000);
  const title = `Heartbeat missed: no check-in for ${monitor.intervalSeconds + monitor.gracePeriodSeconds + overdueSeconds}s`;

  const [, , createdIncident] = await prisma.$transaction([
    prisma.monitorCheck.create({
      data: {
        monitorId: monitor.id,
        status: "DOWN",
        statusCode: null,
        responseTimeMs: null,
        errorMessage: title,
      },
    }),
    prisma.monitor.update({
      where: { id: monitor.id },
      data: {
        status: "DOWN",
        consecutiveFailures: monitor.graceThreshold,
        lastCheckedAt: now,
      },
    }),
    prisma.incident.create({
      data: { monitorId: monitor.id, status: "OPEN", title },
    }),
  ]);

  redis
    .set(
      `monitor:${monitor.id}:live`,
      JSON.stringify({ status: "DOWN", latency: null, statusCode: null, lastChecked: now.toISOString() }),
      "EX",
      300,
    )
    .catch((err: any) => console.error("[HEARTBEAT] Redis live write failed:", err));

  sendWebhookNotifications(monitor.workspaceId, {
    event: "incident.opened",
    incidentId: createdIncident.id,
    monitorId: monitor.id,
    workspaceId: monitor.workspaceId,
    message: `CRITICAL ALERT: Heartbeat monitor [${monitor.name}] missed its check-in window.`,
    timestamp: now.toISOString(),
  }).catch((err) => console.error("[HEARTBEAT] Webhook open failed:", err));
}
