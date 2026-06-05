import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../lib/db";

export async function getMonitorAnalyticsController(
  request: FastifyRequest<{ Params: { workspaceId: string; monitorId: string } }>,
  response: FastifyReply,
) {
  try {
    const monitorId = Number(request.params.monitorId);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const totalWindowMs = 30 * 24 * 60 * 60 * 1000;

    const incidents = await prisma.incident.findMany({
      where: {
        monitorId,
        startedAt: { gte: thirtyDaysAgo },
      },
    });

    let totalDowntimeMs = 0;
    for (const inc of incidents) {
      const end = inc.resolvedAt ? inc.resolvedAt.getTime() : Date.now();
      totalDowntimeMs += end - inc.startedAt.getTime();
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
