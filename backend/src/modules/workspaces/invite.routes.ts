import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  acceptInviteController,
  generateInviteController,
  listInvitesController,
  lookupInviteController,
  revokeInviteController,
} from "./invite.controller";

export async function inviteRoutes(app: FastifyInstance) {
  const write = [requireAuth, requireRole(["OWNER", "ADMIN"])];

  app.get("/invites/:token", lookupInviteController as any);
  app.post("/invites/:token/accept", { preHandler: requireAuth }, acceptInviteController as any);

  app.post("/workspaces/:workspaceId/invites", { preHandler: write }, generateInviteController as any);
  app.get("/workspaces/:workspaceId/invites", { preHandler: write }, listInvitesController as any);
  app.delete("/workspaces/:workspaceId/invites/:inviteId", { preHandler: write }, revokeInviteController as any);
}
