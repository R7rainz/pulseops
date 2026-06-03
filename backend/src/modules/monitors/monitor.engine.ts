import cron from "node-cron";
import { prisma } from "../../lib/db";

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
            // Inject user-configured timeouts dynamically
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

          if (currentAttemptUp) {
            updatedFailures = 0;
            targetStatus = "UP";
          } else {
            updatedFailures += 1;

            if (updatedFailures >= monitor.graceThreshold) {
              targetStatus = "DOWN";
            }
          }

          await prisma.$transaction([
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
          ]);
        }),
      );

      console.log("[ENGINE] Telemetry batch complete.");
    } catch (error) {
      console.error("[ENGINE] Critical execution failure within cycle:", error);
    }
  });
}
