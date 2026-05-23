import { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import { getWorkspaceIncidentsController } from "./incident.controller";

export async function incidentRoutes(app: FastifyInstance) {
  app.get(
    "/workspaces/:workspaceId/incidents",
    { preHandler: requireAuth },
    getWorkspaceIncidentsController,
  );
}
