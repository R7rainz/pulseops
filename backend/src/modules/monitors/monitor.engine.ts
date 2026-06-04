import cron from "node-cron";
import { prisma } from "../../lib/db";
import { sendWebhookNotifications } from "../webhooks/webhook.delivery";

export function startPingEngine() {
  console.log("[SYSTEM] PulseOps industrial Telemetry Engine online.");

  cron.schedule("* * * * *", async () => {
    try {
      const activeMonitors = await prisma.monitor.findMany({
        where: {
          isActive: true,
          status: { not: "PAUSED" },
        },
      });

      if (activeMonitors.length === 0) return;

      console.log(
        `[ENGINE] Dispatching telemetry batches for ${activeMonitors.length} targets...`,
      );

      await Promise.all(
        activeMonitors.map(async (monitor) => {
          const startTime = performance.now();
          let currentAttemptUp = false;
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

            currentAttemptUp = statusCode === monitor.expectedStatus;
          } catch (error) {
            currentAttemptUp = false;
            statusCode = 500;
          }

          const endTime = performance.now();
          const latencyMs = Math.round(endTime - startTime);

          let targetStatus = monitor.status;
          let updatedFailures = monitor.consecutiveFailures;
          let newlyTriggeredIncident = false;
          let activeIncidentsToResolve: any[] = [];

          if (currentAttemptUp) {
            updatedFailures = 0;
            targetStatus = "UP";

            if (monitor.status === "DOWN") {
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
              targetStatus = "DOWN";

              if (monitor.status !== "DOWN" && updatedFailures === monitor.graceThreshold) {
                newlyTriggeredIncident = true;
              }
            }
          }

          const transactionQueries: any[] = [
            prisma.monitorCheck.create({
              data: {
                monitorId: monitor.id,
                status: currentAttemptUp ? "UP" : "DOWN",
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
              },
            }),
          ];

          if (newlyTriggeredIncident) {
            transactionQueries.push(
              prisma.incident.create({
                data: {
                  monitorId: monitor.id,
                  status: "OPEN",
                  title: `Node Offline: HTTP ${statusCode} threshold breached`,
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

          if (newlyTriggeredIncident) {
            const createdIncident = txResults[2];

            sendWebhookNotifications(monitor.workspaceId, {
              event: "incident.opened",
              incidentId: createdIncident.id,
              monitorId: monitor.id,
              workspaceId: monitor.workspaceId,
              message: `CRITICAL OUTAGE: Monitor [${monitor.name}] failed rules checks. Target URL: ${monitor.url}`,
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
                message: `RECOVERY ALERT: Monitor [${monitor.name}] is responding within normal thresholds. All clear.`,
                timestamp: new Date().toISOString(),
              }).catch(err => console.error("[ENGINE] Webhook resolve failed:", err));
            });
          }
        }),
      );

      console.log("[ENGINE] Telemetry batch complete.");
    } catch (error) {
      console.error("[ENGINE] Critical execution failure within cycle:", error);
    }
  });
}
