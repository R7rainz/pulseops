import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/db";

type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export function requireRole(allowedRoles: WorkspaceRole[]) {
  return async (request: FastifyRequest, response: FastifyReply) => {
    try {
      const params = request.params as Record<string, string>;
      const body = request.body as Record<string, unknown> | null;
      const workspaceId = Number(params.workspaceId || body?.workspaceId);
      const userId = request.user?.userId;

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
