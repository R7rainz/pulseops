import "dotenv/config";
import { prisma } from "../lib/db";
import { monitorCheckQueue } from "../queues/monitor.queue";

async function enqueueActiveMonitors() {
  const monitors = await prisma.monitor.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      intervalSeconds: true,
      lastCheckedAt: true,
    },
  });

  const nowMs = Date.now();
  for (const monitor of monitors) {
    const lastCheckedAt = monitor.lastCheckedAt?.getTime();

    const isDue =
      !lastCheckedAt || nowMs - lastCheckedAt >= monitor.intervalSeconds * 1000;
    if (!isDue) continue;

    await monitorCheckQueue.add("run-check", {
      monitorId: monitor.id,
    });

    console.log(`Queued monitor check for monitor ${monitor.id}`);
  }
}

async function main() {
  console.log("Monitor scheduler started");

  await enqueueActiveMonitors();

  setInterval(async () => {
    try {
      await enqueueActiveMonitors();
    } catch (error) {
      console.error("Scheduler failed", error);
    }
  }, 30_000);
}

main();
