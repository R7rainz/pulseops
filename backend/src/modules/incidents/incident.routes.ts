import { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { requireScope, requireWorkspaceAccess } from "../../middleware/workspace-access.middleware";
import {
  acknowledgeIncidentController,
  getIncidentByIdController,
  getWorkspaceIncidentsController,
  resolveIncidentController,
} from "./incident.controller";

const apiSecurity: { [scheme: string]: string[] }[] = [
  { apiKey: [] },
  { bearerAuth: [] },
];

export async function incidentRoutes(app: FastifyInstance) {
  // Reads accept a JWT OR a workspace API key; writes stay JWT-only in v1.
  const apiRead = [requireWorkspaceAccess];
  const write = [requireAuth, requireRole(["OWNER", "ADMIN"]), requireScope("READ_WRITE")];

  app.get(
    "/workspaces/:workspaceId/incidents",
    {
      preHandler: apiRead,
      schema: {
        tags: ["Incidents"],
        summary: "List incidents",
        description: "Returns every incident in the workspace, newest first.",
        security: apiSecurity,
        params: {
          type: "object",
          properties: { workspaceId: { type: "integer" } },
        },
      },
    },
    getWorkspaceIncidentsController as any,
  );

  app.get(
    "/incidents/:incidentId",
    {
      preHandler: apiRead,
      schema: {
        tags: ["Incidents"],
        summary: "Get an incident",
        description: "Returns a single incident by id, with its monitor.",
        security: apiSecurity,
        params: {
          type: "object",
          properties: { incidentId: { type: "integer" } },
        },
      },
    },
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
