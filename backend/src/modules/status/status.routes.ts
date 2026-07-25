import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/db";
import { redis } from "../../lib/redis";

// The response is identical for every visitor and the underlying data only
// changes as checks land, so a short shared cache absorbs traffic spikes on
// what is the app's heaviest query and its only unauthenticated one.
const STATUS_CACHE_TTL_SECONDS = 30;

export async function publicStatusRoutes(app: FastifyInstance) {
  app.get(
    "/:slug",
    {
      // Public and unauthenticated: needs a tighter budget than the global one.
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (
      request: FastifyRequest<{ Params: { slug: string } }>,
      response: FastifyReply,
    ) => {
      try {
        const { slug } = request.params;
        const cacheKey = `status-page:${slug}`;

        // Cache read is best-effort — a Redis outage should degrade to a slower
        // page, never to an error.
        try {
          const cached = await redis.get(cacheKey);
          if (cached) {
            return response
              .header("x-pulseops-cache", "hit")
              .status(200)
              .send(JSON.parse(cached));
          }
        } catch {
          /* fall through to a live read */
        }

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

        // Bucket by day in Postgres. This previously fetched every check for
        // every monitor over 90 days and grouped them in JS — on an
        // unauthenticated route, which made the heaviest query in the app also
        // the most exposed one. The grouped form returns at most 90 rows per
        // monitor regardless of check frequency.
        const daily = monitorIds.length
          ? await prisma.$queryRaw<
              { monitorId: number; day: Date; up: bigint; total: bigint }[]
            >`
              SELECT "monitorId",
                     date_trunc('day', "checkedAt") AS day,
                     COUNT(*) FILTER (WHERE status = 'UP') AS up,
                     COUNT(*)                              AS total
              FROM "MonitorCheck"
              WHERE "monitorId" IN (${Prisma.join(monitorIds)})
                AND "checkedAt" >= ${ninetyDaysAgo}
              GROUP BY "monitorId", date_trunc('day', "checkedAt")
            `
          : [];

        const dailyMap = new Map<number, Map<string, { up: number; total: number }>>();
        for (const id of monitorIds) {
          dailyMap.set(id, new Map());
        }

        for (const row of daily) {
          const day = new Date(row.day).toISOString().slice(0, 10);
          dailyMap.get(row.monitorId)?.set(day, {
            up: Number(row.up),
            total: Number(row.total),
          });
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

        const body = {
          data: {
            workspaceName: workspace.name,
            systemState: degraded,
            metrics: { total, down, paused },
            monitors,
          },
        };

        // Best-effort cache write, same reasoning as the read.
        redis
          .set(cacheKey, JSON.stringify(body), "EX", STATUS_CACHE_TTL_SECONDS)
          .catch(() => {});

        return response
          .header("x-pulseops-cache", "miss")
          .status(200)
          .send(body);
      } catch (error) {
        return response.status(500).send({
          message: "Internal server error",
        });
      }
    },
  );
}
