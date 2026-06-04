import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../lib/db";

export async function publicStatusRoutes(app: FastifyInstance) {
  app.get(
    "/:slug",
    async (
      request: FastifyRequest<{ Params: { slug: string } }>,
      response: FastifyReply,
    ) => {
      try {
        const { slug } = request.params;

        const workspace = await prisma.workspace.findUnique({
          where: { slug },
          select: {
            name: true,
            slug: true,
            monitors: {
              where: { isActive: true },
              select: { id: true, name: true, status: true },
              orderBy: { name: "asc" },
            },
          },
        });

        if (!workspace) {
          return response.status(404).send({ message: "Status page not found" });
        }

        const monitorIds = workspace.monitors.map((m) => m.id);
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        const checks = await prisma.monitorCheck.findMany({
          where: {
            monitorId: { in: monitorIds },
            checkedAt: { gte: ninetyDaysAgo },
          },
          select: { monitorId: true, status: true, checkedAt: true },
        });

        const dailyMap = new Map<number, Map<string, { up: number; total: number }>>();
        for (const id of monitorIds) {
          dailyMap.set(id, new Map());
        }

        for (const check of checks) {
          const day = check.checkedAt.toISOString().slice(0, 10);
          const monitorDays = dailyMap.get(check.monitorId)!;
          const entry = monitorDays.get(day) ?? { up: 0, total: 0 };
          entry.total += 1;
          if (check.status === "UP") entry.up += 1;
          monitorDays.set(day, entry);
        }

        const now = new Date();
        const history: number[][] = [];
        for (const id of monitorIds) {
          const monitorDays = dailyMap.get(id)!;
          const bars: number[] = [];
          for (let i = 89; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const key = date.toISOString().slice(0, 10);
            const entry = monitorDays.get(key);
            if (entry) {
              bars.push(entry.up / entry.total);
            } else {
              bars.push(0);
            }
          }
          history.push(bars);
        }

        const monitors = workspace.monitors.map((m, idx) => ({
          ...m,
          uptimeHistory: history[idx],
        }));

        const total = monitors.length;
        const down = monitors.filter((m) => m.status === "DOWN").length;
        const paused = monitors.filter((m) => m.status === "PAUSED").length;
        const degraded =
          down > 0
            ? down === total
              ? "MAJOR_OUTAGE"
              : "PARTIAL_OUTAGE"
            : "OPERATIONAL";

        return response.status(200).send({
          data: {
            workspaceName: workspace.name,
            systemState: degraded,
            metrics: { total, down, paused },
            monitors,
          },
        });
      } catch (error) {
        return response.status(500).send({
          message: "Internal server error",
        });
      }
    },
  );
}
