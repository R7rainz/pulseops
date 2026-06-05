import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  createMonitorController,
  deleteMonitorController,
  getMonitorChecksController,
  getMonitorController,
  getMonitorStatsController,
  getWorkspaceMonitorsController,
  monitorHeartbeatController,
  pauseMonitorController,
  resumeMonitorController,
  runMonitorCheckController,
  updateMonitorController,
} from "./monitor.controller";
import { requireApiKey } from "../../middleware/api-key.middleware";
import { getMonitorAnalyticsController } from "./monitor.analytics";

export async function monitorRoutes(app: FastifyInstance) {
  app.post(
    "/workspaces/:workspaceId/monitors",
    { preHandler: requireAuth },
    createMonitorController as any,
  );

  app.get(
    "/workspaces/:workspaceId/monitors",
    { preHandler: requireAuth },
    getWorkspaceMonitorsController as any,
  );

  app.post(
    "/monitors/:monitorId/check",
    { preHandler: requireAuth },
    runMonitorCheckController as any,
  );

  app.get(
    "/monitors/:monitorId/checks",
    { preHandler: requireAuth },
    getMonitorChecksController as any,
  );

  app.get(
    "/monitors/:monitorId/stats",
    { preHandler: requireAuth },
    getMonitorStatsController as any,
  );

  app.post(
    "/monitors/:monitorId/pause",
    { preHandler: requireAuth },
    pauseMonitorController as any,
  );

  app.post(
    "/monitors/:monitorId/resume",
    { preHandler: requireAuth },
    resumeMonitorController as any,
  );

  app.get(
    "/workspaces/:workspaceId/monitors/:monitorId",
    { preHandler: requireAuth },
    getMonitorController as any,
  );

  app.patch(
    "/monitors/:monitorId",
    { preHandler: requireAuth },
    updateMonitorController as any,
  );

  app.delete(
    "/monitors/:monitorId",
    { preHandler: requireAuth },
    deleteMonitorController as any,
  );

  app.get(
    "/workspaces/:workspaceId/monitors/:monitorId/analytics",
    { preHandler: requireAuth },
    getMonitorAnalyticsController as any,
  );

  app.post(
    "/monitors/:monitorId/heartbeat",
    { preHandler: requireApiKey },
    monitorHeartbeatController as any,
  );
}
