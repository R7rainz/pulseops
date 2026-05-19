import type { FastifyInstance } from "fastify";
import {
  createWorkspaceController,
  getWorkspacesController,
} from "./workspace.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

export async function workspaceRoutes(app: FastifyInstance) {
  app.post("/", { preHandler: requireAuth }, createWorkspaceController);
  app.get("/", { preHandler: requireAuth }, getWorkspacesController);
}
