import { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  acknowledgeIncidentController,
  getIncidentByIdController,
  getWorkspaceIncidentsController,
  resolveIncidentController,
} from "./incident.controller";

export async function incidentRoutes(app: FastifyInstance) {
  const read = [requireAuth, requireRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"])];
  const write = [requireAuth, requireRole(["OWNER", "ADMIN"])];

  app.get(
    "/workspaces/:workspaceId/incidents",
    { preHandler: read },
    getWorkspaceIncidentsController as any,
  );

  app.get(
    "/incidents/:incidentId",
    { preHandler: read },
    getIncidentByIdController as any,
  );

  app.post(
    "/incidents/:incidentId/acknowledge",
    { preHandler: write },
    acknowledgeIncidentController as any,
  );

  app.post(
    "/incidents/:incidentId/resolve",
    { preHandler: write },
    resolveIncidentController as any,
  );
}
