import cron from "node-cron";
import { prisma } from "../../lib/db";
import { redis } from "../../lib/redis";
import { sendWebhookNotifications } from "../webhooks/webhook.delivery";
import { inspectSslCertificate } from "./tls.inspector";

export function startPingEngine() {
  console.log("[SYSTEM] PulseOps industrial Telemetry Engine online.");

  cron.schedule("* * * * *", async () => {
    try {
      const activeMonitors = await prisma.monitor.findMany({
        where: {
          isActive: true,
          OR: [
            { status: { not: "PAUSED" } },
            {
              status: "PAUSED",
              maintenanceStartAt: { lte: new Date() },
              maintenanceEndAt: { gte: new Date() },
            },
          ],
        },
      });

      if (activeMonitors.length === 0) return;

      await Promise.all(
        activeMonitors.map(async (monitor) => {
          const startTime = performance.now();
          let currentAttemptUp = false;
          let statusCode = 0;

          // 1. Run standard HTTP Ping
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

            currentAttemptUp = statusCode === monitor.expectedStatus;
          } catch (error) {
            currentAttemptUp = false;
            statusCode = 500;
          }

          const endTime = performance.now();
          const latencyMs = Math.round(endTime - startTime);

          // 2. Run SSL Inspection
          const sslData = await inspectSslCertificate(monitor.url);
          const isSslFailing = sslData && sslData.daysRemaining <= 7;

          // 3. Maintenance Window Suppression
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

          // 4. State Machine Logic (factoring in SSL)
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

              // 5. Suppress incident trigger if under maintenance
              if (crossedThreshold && !isUnderMaintenance) {
                newlyTriggeredIncident = true;
                if (isSslFailing && currentAttemptUp) {
                  incidentTitle = `SSL/TLS Degradation: Certificate expires in ${sslData!.daysRemaining} days`;
                }
              }
            }
          }

          // 6. Force PAUSED status in UI during maintenance
          if (isUnderMaintenance) {
            targetStatus = "PAUSED";
          }

          // 4. Build Atomic DB Transaction
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
                tlsIssuer: sslData?.issuer || null,
                tlsValidTo: sslData?.validTo || null,
                tlsDaysRemaining: sslData?.daysRemaining || null,
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

          // 4.5. Write live state to Redis for the live-monitors endpoint
          const liveState = {
            status: targetStatus,
            latency: latencyMs,
            statusCode,
            lastChecked: new Date().toISOString(),
          };
          redis
            .set(`monitor:${monitor.id}:live`, JSON.stringify(liveState), "EX", 300)
            .catch((err: any) => console.error("[ENGINE] Redis live write failed:", err));

          // 5. Blast Webhooks
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
        }),
      );
    } catch (error) {
      console.error("[ENGINE] Critical execution failure:", error);
    }
  });
}
