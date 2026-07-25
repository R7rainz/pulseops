import type { Monitor } from "../../generated/prisma/client";
import { prisma } from "../../lib/db";
import { redis } from "../../lib/redis";
import { BlockedTargetError, assertPublicUrl } from "../../lib/ssrf";
import { sendWebhookNotifications } from "../webhooks/webhook.delivery";
import { inspectSslCertificate } from "./tls.inspector";

// Cap on manually-followed redirects. Each hop is re-validated against the SSRF
// guard, so this only bounds work, not safety.
const MAX_REDIRECTS = 5;

// How close to expiry a certificate has to be before the monitor degrades.
// Configurable so operators can get more than a week of warning; a per-monitor
// override belongs on the Monitor row and is not built yet.
const SSL_EXPIRY_WARNING_DAYS = Number(process.env.SSL_EXPIRY_WARNING_DAYS ?? 7);

export type PingResult = {
  isUp: boolean;
  statusCode: number;
  latencyMs: number;
  // Why the check failed, when it failed. Null on success. Previously this was
  // never populated on the HTTP path, so every outage looked identical.
  errorMessage: string | null;
  tlsIssuer: string | null;
  tlsValidTo: Date | null;
  tlsDaysRemaining: number | null;
  // Whether the certificate actually validated (chain, expiry, hostname).
  tlsValid: boolean | null;
  tlsError: string | null;
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
  let errorMessage: string | null = null;

  try {
    // Re-validate on every probe, not just at save time — DNS can be re-pointed
    // at private space after the monitor was created (rebinding).
    await assertPublicUrl(monitor.url);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      monitor.timeoutMs,
    );

    let response: Response;
    try {
      response = await fetch(monitor.url, {
        signal: controller.signal,
        method: monitor.method,
        cache: "no-store",
        // Don't let a public URL bounce us into the private range. Redirects
        // are followed manually below so each hop is re-validated.
        redirect: "manual",
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Follow redirects ourselves, re-checking every Location against the guard.
    let hops = 0;
    while (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.get("location") &&
      hops < MAX_REDIRECTS
    ) {
      const next = new URL(response.headers.get("location")!, monitor.url).toString();
      await assertPublicUrl(next);

      const hopController = new AbortController();
      const hopTimeout = setTimeout(() => hopController.abort(), monitor.timeoutMs);
      try {
        response = await fetch(next, {
          signal: hopController.signal,
          method: monitor.method,
          cache: "no-store",
          redirect: "manual",
        });
      } finally {
        clearTimeout(hopTimeout);
      }
      hops += 1;
    }

    statusCode = response.status;
    isUp = statusCode === monitor.expectedStatus;
    if (!isUp) {
      errorMessage = `Expected HTTP ${monitor.expectedStatus}, got ${statusCode}`;
    }
  } catch (error) {
    isUp = false;
    // statusCode 0 means "never got an HTTP response" — distinct from a real
    // server-side 500, which the old code was indistinguishable from.
    statusCode = 0;
    errorMessage =
      error instanceof BlockedTargetError
        ? `Blocked: ${error.message}`
        : error instanceof Error && error.name === "AbortError"
          ? `Timed out after ${monitor.timeoutMs}ms`
          : error instanceof Error
            ? error.message
            : "Unknown error";
  }

  const latencyMs = Math.round(performance.now() - startTime);

  const sslData = await inspectSslCertificate(monitor.url);

  return {
    isUp,
    statusCode,
    latencyMs,
    errorMessage,
    tlsIssuer: sslData?.issuer ?? null,
    tlsValidTo: sslData?.validTo ?? null,
    tlsDaysRemaining: sslData?.daysRemaining ?? null,
    tlsValid: sslData?.valid ?? null,
    tlsError: sslData?.error ?? null,
  };
}

// Applies a ping outcome to a monitor: maintenance-window suppression, the
// UP/DOWN/DEGRADED state machine, the MonitorCheck/Monitor/Incident
// transaction, Redis live-state, and webhook notifications. Shared by both
// the on-demand check path and the Kafka metrics consumer.
export async function applyCheckResult(monitor: Monitor, pingResult: PingResult) {
  const {
    isUp: currentAttemptUp,
    statusCode,
    latencyMs,
    errorMessage,
    tlsIssuer,
    tlsValidTo,
    tlsDaysRemaining,
    tlsValid,
    tlsError,
  } = pingResult;

  // A cert nearing expiry degrades the monitor; a cert that fails verification
  // outright (expired, self-signed, wrong hostname) is an SSL failure too — it
  // was previously ignored entirely.
  const sslExpiringSoon =
    tlsDaysRemaining !== null && tlsDaysRemaining <= SSL_EXPIRY_WARNING_DAYS;
  const sslInvalid = tlsValid === false;
  const isSslFailing = sslExpiringSoon || sslInvalid;

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
          incidentTitle = sslInvalid
            ? `SSL/TLS Failure: ${tlsError ?? "certificate did not validate"}`
            : `SSL/TLS Degradation: Certificate expires in ${tlsDaysRemaining} days`;
        } else if (errorMessage) {
          incidentTitle = `Node Offline: ${errorMessage}`;
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
        errorMessage: errorMessage ?? tlsError,
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
      errorMessage: null,
      tlsIssuer: monitor.tlsIssuer,
      tlsValidTo: monitor.tlsValidTo,
      tlsDaysRemaining: monitor.tlsDaysRemaining,
      // Heartbeats carry no TLS handshake of their own — leave the verdict
      // unknown rather than asserting the stored cert is still valid.
      tlsValid: null,
      tlsError: null,
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
