import type { FastifyInstance } from "fastify";
import {
  createWorkspaceController,
  getWorkspacesController,
} from "./workspace.controller.js";

export async function workspaceRoutes(app: FastifyInstance) {
  app.post("/", createWorkspaceController);
  app.get("/", getWorkspacesController);
}
