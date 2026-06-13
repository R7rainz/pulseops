import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  createMonitorController,
  deleteMonitorController,
  getMonitorChecksController,
  getMonitorController,
  getLiveMonitorsController,
  getMonitorStatsController,
  getWorkspaceMonitorsController,
  monitorHeartbeatController,
  pauseMonitorController,
  resumeMonitorController,
  runMonitorCheckController,
  updateMonitorController,
} from "./monitor.controller";
import { requireApiKey } from "../../middleware/api-key.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { getMonitorAnalyticsController } from "./monitor.analytics";

export async function monitorRoutes(app: FastifyInstance) {
  const read = [requireAuth, requireRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"])];
  const write = [requireAuth, requireRole(["OWNER", "ADMIN"])];

  app.post(
    "/workspaces/:workspaceId/monitors",
    { preHandler: write },
    createMonitorController as any,
  );

  app.get(
    "/workspaces/:workspaceId/monitors",
    { preHandler: read },
    getWorkspaceMonitorsController as any,
  );

  app.get(
    "/workspaces/:workspaceId/monitors/live",
    { preHandler: read },
    getLiveMonitorsController as any,
  );

  app.post(
    "/monitors/:monitorId/check",
    { preHandler: write },
    runMonitorCheckController as any,
  );

  app.get(
    "/monitors/:monitorId/checks",
    { preHandler: read },
    getMonitorChecksController as any,
  );

  app.get(
    "/monitors/:monitorId/stats",
    { preHandler: read },
    getMonitorStatsController as any,
  );

  app.post(
    "/monitors/:monitorId/pause",
    { preHandler: write },
    pauseMonitorController as any,
  );

  app.post(
    "/monitors/:monitorId/resume",
    { preHandler: write },
    resumeMonitorController as any,
  );

  app.get(
    "/workspaces/:workspaceId/monitors/:monitorId",
    { preHandler: read },
    getMonitorController as any,
  );

  app.patch(
    "/monitors/:monitorId",
    { preHandler: write },
    updateMonitorController as any,
  );

  app.delete(
    "/monitors/:monitorId",
    { preHandler: write },
    deleteMonitorController as any,
  );

  app.get(
    "/workspaces/:workspaceId/monitors/:monitorId/analytics",
    { preHandler: read },
    getMonitorAnalyticsController as any,
  );

  app.post(
    "/monitors/:monitorId/heartbeat",
    { preHandler: requireApiKey },
    monitorHeartbeatController as any,
  );
}
