import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  createWebhookController,
  deleteWebhookController,
  getWorkspaceWebhooksController,
} from "./webhook.controller";

export async function webhookRoutes(app: FastifyInstance) {
  app.post(
    "/workspaces/:workspaceId/webhooks",
    { preHandler: requireAuth },
    createWebhookController,
  );

  app.get(
    "/workspaces/:workspaceId/webhooks",
    { preHandler: requireAuth },
    getWorkspaceWebhooksController,
  );

  app.delete(
    "/webhooks/:webhookId",
    { preHandler: requireAuth },
    deleteWebhookController,
  );
}
