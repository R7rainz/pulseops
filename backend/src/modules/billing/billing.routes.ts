import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  createSubscriptionController,
  verifyPaymentController,
} from "./billing.controller";

export async function billingRoutes(app: FastifyInstance) {
  const owner = [requireAuth, requireRole(["OWNER"])];

  app.post("/workspaces/:workspaceId/subscription", { preHandler: owner }, createSubscriptionController as any);
  app.post("/workspaces/:workspaceId/subscription/verify", { preHandler: owner }, verifyPaymentController as any);
}
