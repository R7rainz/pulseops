import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  createWebhookController,
  updateWebhookController,
  deleteWebhookController,
  getWebhookDeliveryLogsController,
  getWorkspaceWebhooksController,
  toggleWebhookController,
  testWebhookController,
} from "./webhook.controller";

export async function webhookRoutes(app: FastifyInstance) {
  const read = [requireAuth, requireRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"])];
  const write = [requireAuth, requireRole(["OWNER", "ADMIN"])];

  app.post(
    "/workspaces/:workspaceId/webhooks",
    { preHandler: write },
    createWebhookController as any,
  );

  app.get(
    "/workspaces/:workspaceId/webhooks",
    { preHandler: read },
    getWorkspaceWebhooksController as any,
  );

  app.patch(
    "/webhooks/:webhookId",
    { preHandler: write },
    updateWebhookController as any,
  );

  app.delete(
    "/webhooks/:webhookId",
    { preHandler: write },
    deleteWebhookController as any,
  );

  app.post(
    "/webhooks/:webhookId/toggle",
    { preHandler: write },
    toggleWebhookController as any,
  );

  app.post(
    "/webhooks/:webhookId/test",
    { preHandler: write },
    testWebhookController as any,
  );

  app.get(
    "/webhooks/:webhookId/delivery-logs",
    { preHandler: read },
    getWebhookDeliveryLogsController as any,
  );
}
