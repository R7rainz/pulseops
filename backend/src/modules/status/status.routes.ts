import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../lib/db";

export async function publicStatusRoutes(app: FastifyInstance) {
  app.get(
    "/:slug",
    async (
      request: FastifyRequest<{ Params: { slug: string } }>,
      response: FastifyReply
    ) => {
      try {
        const { slug } = request.params

        const workspace = await prisma.workspace.findUnique({
          where: { slug },
          select: {
            name: true,
            slug: true,
            monitors: {
              where: {
                isActive: true
              },
              select: {
                id: true,
                name: true,
                status: true,
              },
              orderBy: { name: "asc" },
            },
          },
        })
        if (!workspace) {
          return response.status(404).send({ message: "Status page not found" })
        }

        const total = workspace.monitors.length
        const down = workspace.monitors.filter(m => m.status === "DOWN").length
        const paused = workspace.monitors.filter(m => m.status === "PAUSED").length
        const degraded = down > 0 ? (down === total ? "MAJOR_OUTAGE" : "PARTIAL_OUTAGE") : "OPERATIONAL"

        return response.status(200).send({
          data: {
            workspaceName: workspace.name,
            systemState: degraded,
            metrics: { total, down, paused },
            monitors: workspace.monitors,
          },
        })
      } catch (error) {
        return response.status(500).send({
          message: "Internal server error"
        })
      }
    }
  )
}
