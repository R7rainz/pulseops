import { prisma } from "../../lib/db";
import { applyHeartbeatMiss, isHeartbeatOverdue } from "./monitor.engine";

let sweepInterval: NodeJS.Timeout | null = null;

// Periodically scans active heartbeat monitors and flips any whose check-in is
// overdue to DOWN (opening an incident + webhook). Monitors already DOWN are
// skipped inside applyHeartbeatMiss, so this is safe to run frequently.
async function sweepHeartbeats() {
  const now = new Date();

  const candidates = await prisma.monitor.findMany({
    where: {
      type: "HEARTBEAT",
      isActive: true,
      status: { not: "DOWN" },
    },
  });

  const overdue = candidates.filter((monitor) => isHeartbeatOverdue(monitor, now));
  if (overdue.length === 0) return;

  for (const monitor of overdue) {
    try {
      await applyHeartbeatMiss(monitor);
    } catch (error) {
      console.error(`[HEARTBEAT] Sweep failed for monitor ${monitor.id}:`, error);
    }
  }

  console.log(`[HEARTBEAT] Flagged ${overdue.length} overdue heartbeat monitor(s)`);
}

export function startHeartbeatScheduler(intervalMs = 30000) {
  if (sweepInterval) return;

  console.log(`[HEARTBEAT] Sweeping for missed heartbeats every ${intervalMs / 1000}s`);

  sweepHeartbeats().catch((error) => console.error("[HEARTBEAT] Sweep tick failed:", error));

  sweepInterval = setInterval(() => {
    sweepHeartbeats().catch((error) => console.error("[HEARTBEAT] Sweep tick failed:", error));
  }, intervalMs);
}

export function stopHeartbeatScheduler() {
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
    console.log("[HEARTBEAT] Sweep loop stopped.");
  }
}
