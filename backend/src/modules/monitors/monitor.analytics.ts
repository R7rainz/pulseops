import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../lib/db";
import { assertWorkspaceAccess } from "../../middleware/workspace-access.middleware";

export async function getMonitorAnalyticsController(
  request: FastifyRequest<{ Params: { workspaceId: string; monitorId: string } }>,
  response: FastifyReply,
) {
  try {
    const monitorId = Number(request.params.monitorId);

    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
      select: { createdAt: true, workspaceId: true },
    });

    if (!monitor) {
      return response.status(404).send({ message: "Monitor not found" });
    }

    // The route middleware authorizes the :workspaceId in the path, not this
    // monitor. Re-check against the monitor's actual workspace so a tampered
    // monitorId can't read another tenant's analytics.
    try {
      await assertWorkspaceAccess(request.access!, monitor.workspaceId);
    } catch {
      return response.status(404).send({ message: "Monitor not found" });
    }

    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    // Clamp the window to the monitor's actual age so a monitor created a few
    // days ago isn't diluted by a full 30-day denominator it hasn't existed for.
    const windowStartMs = Math.max(monitor.createdAt.getTime(), now - thirtyDaysMs);
    const totalWindowMs = Math.max(1, now - windowStartMs);
    const windowStart = new Date(windowStartMs);

    // Any incident overlapping the window counts, even if it started before the
    // window began — only the portion of its duration inside the window is used.
    const incidents = await prisma.incident.findMany({
      where: {
        monitorId,
        startedAt: { lt: new Date(now) },
        OR: [{ resolvedAt: null }, { resolvedAt: { gte: windowStart } }],
      },
    });

    let totalDowntimeMs = 0;
    for (const inc of incidents) {
      const start = Math.max(inc.startedAt.getTime(), windowStartMs);
      const end = Math.min(inc.resolvedAt ? inc.resolvedAt.getTime() : now, now);
      totalDowntimeMs += Math.max(0, end - start);
    }

    const uptimeDecimal = Math.max(0, (totalWindowMs - totalDowntimeMs) / totalWindowMs);
    const uptimePercentage = (uptimeDecimal * 100).toFixed(4);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const latencyAgg = await prisma.monitorCheck.aggregate({
      where: {
        monitorId,
        checkedAt: { gte: twentyFourHoursAgo },
        status: "UP",
      },
      _avg: { responseTimeMs: true },
    });

    return response.status(200).send({
      data: {
        uptime30Day: parseFloat(uptimePercentage),
        totalOutages30Day: incidents.length,
        downtimeMinutes30Day: Math.round(totalDowntimeMs / 60000),
        avgLatency24h: Math.round(latencyAgg._avg.responseTimeMs || 0),
      },
    });
  } catch (error) {
    console.error("[ANALYTICS] SLA Calculation Failed:", error);
    return response.status(500).send({ message: "Analytics engine failure" });
  }
}
