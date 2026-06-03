import { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  acknowledgeIncidentController,
  getIncidentByIdController,
  getWorkspaceIncidentsController,
  resolveIncidentController,
} from "./incident.controller";

export async function incidentRoutes(app: FastifyInstance) {
  app.get(
    "/workspaces/:workspaceId/incidents",
    { preHandler: requireAuth },
    getWorkspaceIncidentsController as any,
  );

  app.get(
    "/incidents/:incidentId",
    { preHandler: requireAuth },
    getIncidentByIdController as any,
  );

  app.post(
    "/incidents/:incidentId/acknowledge",
    { preHandler: requireAuth },
    acknowledgeIncidentController as any,
  );

  app.post(
    "/incidents/:incidentId/resolve",
    { preHandler: requireAuth },
    resolveIncidentController as any,
  );
}
