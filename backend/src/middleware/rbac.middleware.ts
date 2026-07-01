import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/db";

type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export function requireRole(allowedRoles: WorkspaceRole[]) {
  return async (request: FastifyRequest, response: FastifyReply) => {
    try {
      const params = request.params as Record<string, string>;
      const body = request.body as Record<string, unknown> | null;
      const userId = request.user?.userId;

      let workspaceId = Number(params.workspaceId || body?.workspaceId);

      if (!workspaceId && params.incidentId) {
        const incident = await prisma.incident.findUnique({
          where: { id: Number(params.incidentId) },
          select: { monitor: { select: { workspaceId: true } } },
        });

        if (!incident) {
          return response.status(404).send({ message: "Incident not found" });
        }

        workspaceId = incident.monitor.workspaceId;
      }

      if (!workspaceId && params.keyId) {
        const apiKey = await prisma.apiKey.findUnique({
          where: { id: Number(params.keyId) },
          select: { workspaceId: true },
        });

        if (!apiKey) {
          return response.status(404).send({ message: "API key not found" });
        }

        workspaceId = apiKey.workspaceId;
      }

      if (!workspaceId) {
        return response.status(400).send({ message: "Workspace context missing for authorization" });
      }

      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: { userId, workspaceId },
        },
        select: { role: true },
      });

      if (!membership) {
        return response.status(403).send({ message: "You are not a member of this workspace" });
      }

      if (!allowedRoles.includes(membership.role as WorkspaceRole)) {
        return response.status(403).send({
          message: `Access Denied: Requires [${allowedRoles.join(" | ")}] privileges. Your current role is [${membership.role}].`,
        });
      }

      request.user.role = membership.role;
    } catch (error) {
      console.error("[RBAC_GUARD] Authorization failure:", error);
      return response.status(500).send({ message: "Internal authorization error" });
    }
  };
}
