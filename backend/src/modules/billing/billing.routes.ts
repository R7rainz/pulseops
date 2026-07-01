import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  createSubscriptionController,
  verifyPaymentController,
  razorpayWebhookController,
} from "./billing.controller";

export async function billingRoutes(app: FastifyInstance) {
  const owner = [requireAuth, requireRole(["OWNER"])];

  app.post("/workspaces/:workspaceId/subscription", { preHandler: owner }, createSubscriptionController as any);
  app.post("/workspaces/:workspaceId/subscription/verify", { preHandler: owner }, verifyPaymentController as any);

  // Scoped so only this route gets the raw-body parser — Razorpay signs the
  // exact bytes it sent, and re-serializing the parsed JSON can desync the HMAC.
  await app.register(async function webhookScope(scoped) {
    scoped.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (req, body, done) => {
        (req as any).rawBody = body as Buffer;
        try {
          const json = (body as Buffer).length ? JSON.parse((body as Buffer).toString("utf8")) : {};
          done(null, json);
        } catch (err) {
          done(err as Error, undefined);
        }
      },
    );

    scoped.post("/billing/webhook", razorpayWebhookController as any);
  });
}
