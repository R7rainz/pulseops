import { prisma } from "../../lib/db";
import { dispatchMonitorsToWorkers } from "./monitor.service";

let schedulerInterval: NodeJS.Timeout | null = null;

export async function tickScheduler() {
  try {
    const activeMonitors = await prisma.monitor.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        url: true,
        workspaceId: true,
      },
    });

    if (activeMonitors.length === 0) return;

    console.log(`[SCHEDULER] Dispatching ${activeMonitors.length} active monitors to Kafka.`);

    await dispatchMonitorsToWorkers(activeMonitors);
  } catch (error) {
    console.error("[SCHEDULER] Critical error during monitor dispatch tick:", error);
  }
}

export function startScheduler(intervalMs = 60000) {
  if (schedulerInterval) return;

  console.log(`[SCHEDULER] Initializing engine loop with a ${intervalMs / 1000}s check frequency.`);

  tickScheduler();

  schedulerInterval = setInterval(async () => {
    await tickScheduler();
  }, intervalMs);
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[SCHEDULER] Polling loop safely halted.");
  }
}
