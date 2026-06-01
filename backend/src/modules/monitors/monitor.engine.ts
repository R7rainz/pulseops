import cron from "node-cron";
import { prisma } from "../../lib/db";

export function startPingEngine() {
  console.log("⚡ [SYSTEM] PulseOps Ping Engine Initialized.");

  //run every 1 minute. (For testing, you could use '*/30 * * * * *' for every 30 seconds)
  cron.schedule("* * * * *", async () => {
    try {
      const activeMonitors = await prisma.monitor.findMany({
        where: { status: { not: "PAUSED" } },
      });

      if (activeMonitors.length === 0) return;

      console.log(
        `📡 [ENGINE] Executing telemetry ping for ${activeMonitors.length} nodes...`,
      );

      await Promise.all(
        activeMonitors.map(async (monitor) => {
          const startTime = performance.now();
          let isUp = false;
          let statusCode = 0;

          try {
            //strict 10-second timeout. If it hangs, it's dead.
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(monitor.url, {
              signal: controller.signal,
              method: "GET",
              cache: "no-store",
            });

            clearTimeout(timeoutId);

            statusCode = response.status;
            isUp = response.ok;
          } catch (error) {
            //catches DNS failures, abort timeouts, and dead connections
            isUp = false;
            statusCode = 500;
          }

          const endTime = performance.now();
          const latencyMs = Math.round(endTime - startTime);
          const currentStatus = isUp ? "UP" : "DOWN";

          await prisma.monitorCheck.create({
            data: {
              monitorId: monitor.id,
              status: currentStatus,
              statusCode: statusCode,
              responseTime: latencyMs,
            },
          });

          //update the main monitor state
          await prisma.monitor.update({
            where: { id: monitor.id },
            data: {
              status: currentStatus,
              lastCheckedAt: new Date(),
            },
          });
        }),
      );

      console.log("✅ [ENGINE] Telemetry cycle complete.");
    } catch (error) {
      console.error("❌ [ENGINE] Fatal execution error in cycle:", error);
    }
  });
}
