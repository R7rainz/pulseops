import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  createMonitorController,
  getMonitorChecksController,
  getWorkspaceMonitorsController,
  runMonitorCheckController,
} from "./monitor.controller";

export async function monitorRoutes(app: FastifyInstance) {
  app.post(
    "/workspaces/:workspaceId/monitors",
    { preHandler: requireAuth },
    createMonitorController,
  );

  app.get(
    "/workspaces/:workspaceId/monitors",
    { preHandler: requireAuth },
    getWorkspaceMonitorsController,
  );

  app.post(
    "/monitors/:monitorId/check",
    { preHandler: requireAuth },
    runMonitorCheckController,
  );

  app.get(
    "/monitors/:monitorId/checks",
    { preHandler: requireAuth },
    getMonitorChecksController,
  );
}
