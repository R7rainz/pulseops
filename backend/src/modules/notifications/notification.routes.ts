import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  requireScope,
  requireWorkspaceAccess,
} from "../../middleware/workspace-access.middleware";
import { createChannelSchema, updateChannelSchema } from "./notification.schema";
import {
  createChannelService,
  deleteChannelService,
  getChannelDeliveriesService,
  listChannelsService,
  testChannelService,
  updateChannelService,
} from "./notification.service";

const apiSecurity: { [scheme: string]: string[] }[] = [{ apiKey: [] }, { bearerAuth: [] }];

export async function notificationRoutes(app: FastifyInstance) {
  const read = [requireWorkspaceAccess];
  const write = [requireAuth, requireRole(["OWNER", "ADMIN"]), requireScope("READ_WRITE")];

  app.get(
    "/workspaces/:workspaceId/channels",
    {
      preHandler: read,
      schema: {
        tags: ["Notifications"],
        summary: "List alert channels",
        description:
          "Alert channels for the workspace. Secret config values (webhook URLs, routing keys) are redacted.",
        security: apiSecurity,
        params: { type: "object", properties: { workspaceId: { type: "integer" } } },
      },
    },
    (async (
      request: FastifyRequest<{ Params: { workspaceId: string } }>,
      reply: FastifyReply,
    ) => {
      const data = await listChannelsService(
        request.access!,
        Number(request.params.workspaceId),
      );
      return reply.status(200).send({ data });
    }) as any,
  );

  app.post(
    "/workspaces/:workspaceId/channels",
    { preHandler: write },
    (async (
      request: FastifyRequest<{ Params: { workspaceId: string } }>,
      reply: FastifyReply,
    ) => {
      const input = createChannelSchema.parse(request.body);
      const data = await createChannelService(
        request.user!.userId,
        Number(request.params.workspaceId),
        input,
      );
      return reply.status(201).send({ data });
    }) as any,
  );

  app.patch(
    "/workspaces/:workspaceId/channels/:channelId",
    { preHandler: write },
    (async (
      request: FastifyRequest<{ Params: { workspaceId: string; channelId: string } }>,
      reply: FastifyReply,
    ) => {
      const input = updateChannelSchema.parse(request.body);
      const data = await updateChannelService(
        request.user!.userId,
        Number(request.params.channelId),
        input,
      );
      return reply.status(200).send({ data });
    }) as any,
  );

  app.delete(
    "/workspaces/:workspaceId/channels/:channelId",
    { preHandler: write },
    (async (
      request: FastifyRequest<{ Params: { workspaceId: string; channelId: string } }>,
      reply: FastifyReply,
    ) => {
      const data = await deleteChannelService(
        request.user!.userId,
        Number(request.params.channelId),
      );
      return reply.status(200).send({ data });
    }) as any,
  );

  app.post(
    "/workspaces/:workspaceId/channels/:channelId/test",
    {
      preHandler: write,
      // Sends a real message to a third party — keep it well below the global budget.
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    (async (
      request: FastifyRequest<{ Params: { workspaceId: string; channelId: string } }>,
      reply: FastifyReply,
    ) => {
      const result = await testChannelService(
        request.user!.userId,
        Number(request.params.channelId),
      );
      // 200 either way: the request succeeded, `ok` reports whether delivery did.
      return reply.status(200).send({ data: result });
    }) as any,
  );

  app.get(
    "/workspaces/:workspaceId/channels/:channelId/deliveries",
    {
      preHandler: read,
      schema: {
        tags: ["Notifications"],
        summary: "Channel delivery log",
        security: apiSecurity,
        params: {
          type: "object",
          properties: { workspaceId: { type: "integer" }, channelId: { type: "integer" } },
        },
      },
    },
    (async (
      request: FastifyRequest<{
        Params: { workspaceId: string; channelId: string };
        Querystring: { limit?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const data = await getChannelDeliveriesService(
        request.access!,
        Number(request.params.channelId),
        request.query.limit ? Number(request.query.limit) : 50,
      );
      return reply.status(200).send({ data });
    }) as any,
  );
}
