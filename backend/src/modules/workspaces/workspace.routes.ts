import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware.js";
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

export async function workspaceRoutes(app: FastifyInstance) {
  app.post("/", { preHandler: requireAuth }, createWorkspaceController);
  app.get("/", { preHandler: requireAuth }, getWorkspacesController);
  app.get("/:workspaceId", { preHandler: requireAuth }, getWorkspaceController as any);
  app.patch("/:workspaceId", { preHandler: requireAuth }, updateWorkspaceController as any);
  app.delete("/:workspaceId", { preHandler: requireAuth }, deleteWorkspaceController as any);

  app.post("/:workspaceId/api-keys", { preHandler: requireAuth }, createApiKeyController as any);
  app.get("/:workspaceId/api-keys", { preHandler: requireAuth }, getApiKeysController as any);
  app.delete("/api-keys/:keyId", { preHandler: requireAuth }, revokeApiKeyController as any);
}
