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
import { requireScope, requireWorkspaceAccess } from "../../middleware/workspace-access.middleware";
import { getMonitorAnalyticsController } from "./monitor.analytics";

// Only routes with a `schema.tags` entry are surfaced in the OpenAPI spec
// (see the transform in app.ts). These are the endpoints an API key unlocks,
// so we document them and mark them as accepting either credential.
type SecurityRequirement = { [scheme: string]: string[] };
const apiSecurity: SecurityRequirement[] = [{ apiKey: [] }, { bearerAuth: [] }];
const keyOnlySecurity: SecurityRequirement[] = [{ apiKey: [] }];
const workspaceIdParam = { workspaceId: { type: "integer" } };
const monitorIdParams = {
  workspaceId: { type: "integer" },
  monitorId: { type: "integer" },
};

export async function monitorRoutes(app: FastifyInstance) {
  // Reads accept a JWT (workspace member) OR a workspace API key.
  const apiRead = [requireWorkspaceAccess];
  // Writes remain browser/JWT-only in v1 — requireAuth rejects key-auth outright.
  // requireScope is a no-op for JWT callers, but it means a READ_ONLY key can
  // never mutate if key-auth is ever extended to these routes.
  const write = [requireAuth, requireRole(["OWNER", "ADMIN"]), requireScope("READ_WRITE")];

  app.post(
    "/workspaces/:workspaceId/monitors",
    { preHandler: write },
    createMonitorController as any,
  );

  app.get(
    "/workspaces/:workspaceId/monitors",
    {
      preHandler: apiRead,
      schema: {
        tags: ["Monitors"],
        summary: "List monitors",
        description: "Returns every monitor in the workspace.",
        security: apiSecurity,
        params: { type: "object", properties: workspaceIdParam },
      },
    },
    getWorkspaceMonitorsController as any,
  );

  app.get(
    "/workspaces/:workspaceId/monitors/live",
    {
      preHandler: apiRead,
      schema: {
        tags: ["Monitors"],
        summary: "Live monitor state",
        description:
          "Returns the latest cached status/latency for each active monitor, keyed by monitor id.",
        security: apiSecurity,
        params: { type: "object", properties: workspaceIdParam },
      },
    },
    getLiveMonitorsController as any,
  );

  // On-demand checks do real network + DB work per request, so they get a
  // much tighter per-IP budget than the global limit. A per-monitor Redis
  // cooldown in the service additionally protects the target site itself.
  app.post(
    "/workspaces/:workspaceId/monitors/:monitorId/check",
    {
      preHandler: write,
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
    },
    runMonitorCheckController as any,
  );

  app.get(
    "/workspaces/:workspaceId/monitors/:monitorId/checks",
    {
      preHandler: apiRead,
      schema: {
        tags: ["Monitors"],
        summary: "List monitor checks",
        description: "Paginated history of check results for a monitor.",
        security: apiSecurity,
        params: { type: "object", properties: monitorIdParams },
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 200, default: 20 },
            offset: { type: "integer", minimum: 0, default: 0 },
          },
        },
      },
    },
    getMonitorChecksController as any,
  );

  app.get(
    "/workspaces/:workspaceId/monitors/:monitorId/stats",
    {
      preHandler: apiRead,
      schema: {
        tags: ["Monitors"],
        summary: "Monitor statistics",
        description:
          "Uptime and latency percentiles (all-time, 24h and 30d windows) for a monitor.",
        security: apiSecurity,
        params: { type: "object", properties: monitorIdParams },
      },
    },
    getMonitorStatsController as any,
  );

  app.post(
    "/workspaces/:workspaceId/monitors/:monitorId/pause",
    { preHandler: write },
    pauseMonitorController as any,
  );

  app.post(
    "/workspaces/:workspaceId/monitors/:monitorId/resume",
    { preHandler: write },
    resumeMonitorController as any,
  );

  app.get(
    "/workspaces/:workspaceId/monitors/:monitorId",
    {
      preHandler: apiRead,
      schema: {
        tags: ["Monitors"],
        summary: "Get a monitor",
        description: "Returns a single monitor by id.",
        security: apiSecurity,
        params: { type: "object", properties: monitorIdParams },
      },
    },
    getMonitorController as any,
  );

  app.patch(
    "/workspaces/:workspaceId/monitors/:monitorId",
    { preHandler: write },
    updateMonitorController as any,
  );

  app.delete(
    "/workspaces/:workspaceId/monitors/:monitorId",
    { preHandler: write },
    deleteMonitorController as any,
  );

  app.get(
    "/workspaces/:workspaceId/monitors/:monitorId/analytics",
    {
      preHandler: apiRead,
      schema: {
        tags: ["Monitors"],
        summary: "Monitor SLA analytics",
        description:
          "30-day uptime %, outage count, downtime minutes and 24h average latency.",
        security: apiSecurity,
        params: { type: "object", properties: monitorIdParams },
      },
    },
    getMonitorAnalyticsController as any,
  );

  app.post(
    "/monitors/:monitorId/heartbeat",
    {
      preHandler: requireApiKey,
      schema: {
        tags: ["Heartbeat"],
        summary: "Send a heartbeat",
        description:
          "Push endpoint for HEARTBEAT monitors. Call this on your schedule to keep the monitor UP; a missed heartbeat past the grace period opens an incident.",
        security: keyOnlySecurity,
        params: {
          type: "object",
          properties: { monitorId: { type: "integer" } },
        },
      },
    },
    monitorHeartbeatController as any,
  );
}
