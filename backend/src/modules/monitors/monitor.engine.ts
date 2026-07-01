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
