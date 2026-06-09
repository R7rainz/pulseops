import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/rbac.middleware.js";
import {
  createWorkspaceController,
  getWorkspacesController,
  getWorkspaceController,
  updateWorkspaceController,
  deleteWorkspaceController,
} from "./workspace.controller.js";
import {
  createApiKeyController,
  getApiKeysController,
  revokeApiKeyController,
} from "./api-key.controller.js";
import {
  listMembersController,
  removeMemberController,
  updateMemberRoleController,
} from "./member.controller.js";

export async function workspaceRoutes(app: FastifyInstance) {
  const read = [requireAuth, requireRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"])];
  const write = [requireAuth, requireRole(["OWNER", "ADMIN"])];
  const ownerOnly = [requireAuth, requireRole(["OWNER"])];

  app.post("/", { preHandler: requireAuth }, createWorkspaceController);
  app.get("/", { preHandler: requireAuth }, getWorkspacesController);
  app.get("/:workspaceId", { preHandler: read }, getWorkspaceController as any);
  app.patch("/:workspaceId", { preHandler: write }, updateWorkspaceController as any);
  app.delete("/:workspaceId", { preHandler: ownerOnly }, deleteWorkspaceController as any);

  app.get("/:workspaceId/members", { preHandler: read }, listMembersController as any);
  app.delete("/:workspaceId/members/:userId", { preHandler: write }, removeMemberController as any);
  app.patch("/:workspaceId/members/:userId", { preHandler: write }, updateMemberRoleController as any);

  app.post("/:workspaceId/api-keys", { preHandler: write }, createApiKeyController as any);
  app.get("/:workspaceId/api-keys", { preHandler: read }, getApiKeysController as any);
  app.delete("/api-keys/:keyId", { preHandler: write }, revokeApiKeyController as any);
}
