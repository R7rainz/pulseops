import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  requireScope,
  requireWorkspaceAccess,
} from "../../middleware/workspace-access.middleware";
import {
  deleteStatusPageService,
  getStatusPageService,
  statusPageSchema,
  upsertStatusPageService,
} from "./status-page.service";

// Authenticated management of the workspace's public status page. The page
// itself is served by publicStatusRoutes at /api/v1/status/:slug.
export async function statusPageRoutes(app: FastifyInstance) {
  const read = [requireWorkspaceAccess];
  const write = [requireAuth, requireRole(["OWNER", "ADMIN"]), requireScope("READ_WRITE")];

  app.get(
    "/workspaces/:workspaceId/status-page",
    { preHandler: read },
    (async (
      request: FastifyRequest<{ Params: { workspaceId: string } }>,
      reply: FastifyReply,
    ) => {
      const data = await getStatusPageService(
        request.access!,
        Number(request.params.workspaceId),
      );
      return reply.status(200).send({ data });
    }) as any,
  );

  app.put(
    "/workspaces/:workspaceId/status-page",
    { preHandler: write },
    (async (
      request: FastifyRequest<{ Params: { workspaceId: string } }>,
      reply: FastifyReply,
    ) => {
      const input = statusPageSchema.parse(request.body);
      const data = await upsertStatusPageService(
        request.user!.userId,
        Number(request.params.workspaceId),
        input,
      );
      return reply.status(200).send({ data });
    }) as any,
  );

  app.delete(
    "/workspaces/:workspaceId/status-page",
    { preHandler: write },
    (async (
      request: FastifyRequest<{ Params: { workspaceId: string } }>,
      reply: FastifyReply,
    ) => {
      const data = await deleteStatusPageService(
        request.user!.userId,
        Number(request.params.workspaceId),
      );
      return reply.status(200).send({ data });
    }) as any,
  );
}
