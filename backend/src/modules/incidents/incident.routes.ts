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
    getWorkspaceIncidentsController,
  );

  app.get(
    "/incidents/:incidentId",
    { preHandler: requireAuth },
    getIncidentByIdController,
  );

  app.post(
    "/incidents/:incidentId/acknowledge",
    { preHandler: requireAuth },
    acknowledgeIncidentController,
  );

  app.post(
    "/incidents/:incidentId/resolve",
    { preHandler: requireAuth },
    resolveIncidentController,
  );
}
