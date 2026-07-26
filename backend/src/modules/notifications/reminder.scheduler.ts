import { prisma } from "../../lib/db";
import { withLeaderLock } from "../../lib/leader-lock";
import { dispatchNotification } from "./notification.dispatch";

// A long outage previously went silent after the first alert — nothing
// re-notified while an incident stayed open, so an unnoticed page meant an
// unnoticed outage. This re-alerts on the monitor's reminderIntervalSeconds
// cadence (0 = off, which is the default, so this is strictly opt-in).

let reminderInterval: NodeJS.Timeout | null = null;

async function sweepReminders() {
  const now = new Date();

  // Still-open incidents on monitors that have reminders enabled and aren't
  // muted. The reminder cadence is measured from the last reminder, falling
  // back to when the incident started.
  const candidates = await prisma.incident.findMany({
    where: {
      status: { in: ["OPEN", "ACKNOWLEDGED"] },
      monitor: {
        isActive: true,
        reminderIntervalSeconds: { gt: 0 },
        OR: [{ mutedUntil: null }, { mutedUntil: { lte: now } }],
      },
    },
    include: { monitor: true },
  });

  const due = candidates.filter((incident) => {
    const since = incident.lastReminderAt ?? incident.startedAt;
    return (
      now.getTime() - since.getTime() >=
      incident.monitor.reminderIntervalSeconds * 1000
    );
  });

  if (due.length === 0) return;

  for (const incident of due) {
    const downForMs = now.getTime() - incident.startedAt.getTime();

    try {
      await dispatchNotification(incident.monitor.workspaceId, {
        event: "incident.reminder",
        incidentId: incident.id,
        monitorId: incident.monitorId,
        workspaceId: incident.monitor.workspaceId,
        monitorName: incident.monitor.name,
        monitorUrl: incident.monitor.url,
        status: incident.monitor.status,
        title: incident.title,
        message: `Still unresolved: [${incident.monitor.name}] has been down for ${Math.round(downForMs / 60000)} minutes.`,
        timestamp: now.toISOString(),
        durationMs: downForMs,
      });

      await prisma.incident.update({
        where: { id: incident.id },
        data: { lastReminderAt: now },
      });
    } catch (error) {
      console.error(`[REMINDER] Failed for incident ${incident.id}:`, error);
    }
  }

  console.log(`[REMINDER] Sent ${due.length} reminder(s) for still-open incident(s)`);
}

export function startReminderScheduler(intervalMs = 60_000) {
  if (reminderInterval) return;

  console.log(`[REMINDER] Checking for overdue incident reminders every ${intervalMs / 1000}s`);

  // Leader-locked like the other periodic jobs so replicas don't each remind.
  const tick = () =>
    withLeaderLock("incident-reminders", intervalMs - 1000, sweepReminders).catch((error) =>
      console.error("[REMINDER] Sweep failed:", error),
    );

  reminderInterval = setInterval(tick, intervalMs);
}

export function stopReminderScheduler() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    console.log("[REMINDER] Scheduler stopped.");
  }
}
