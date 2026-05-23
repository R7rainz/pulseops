import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  createMonitorController,
  deleteMonitorController,
  getMonitorChecksController,
  getMonitorStatsController,
  getWorkspaceMonitorsController,
  pauseMonitorController,
  resumeMonitorController,
  runMonitorCheckController,
  updateMonitorController,
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

  app.get(
    "/monitors/:monitorId/stats",
    { preHandler: requireAuth },
    getMonitorStatsController,
  );

  app.post(
    "/monitors/:monitorId/pause",
    { preHandler: requireAuth },
    pauseMonitorController,
  );

  app.post(
    "/monitors/:monitorId/resume",
    { preHandler: requireAuth },
    resumeMonitorController,
  );

  app.patch(
    "/monitors/:monitorId",
    { preHandler: requireAuth },
    updateMonitorController,
  );

  app.delete(
    "/monitors/:monitorId",
    { preHandler: requireAuth },
    deleteMonitorController,
  );
}
