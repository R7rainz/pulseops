import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/db";
import { verifyAccessToken } from "../lib/jwt";

// Normalized authorization context set by requireWorkspaceAccess. Both human
// (JWT) and machine (API key) callers are collapsed into this shape so read
// controllers/services don't need to care which credential was used.
//
// - user mode:    userId is set; authorize a workspace via membership.
// - machine mode: workspaceId is fixed to the key's workspace, scope is set.
export interface AccessContext {
  workspaceId: number;
  mode: "user" | "machine";
  userId?: number;
  scope?: "READ_ONLY" | "READ_WRITE";
}

declare module "fastify" {
  interface FastifyRequest {
    access?: AccessContext;
  }
}

// Resolve the workspace a request is targeting from its route/body. Mirrors the
// resolution in rbac.middleware so key-auth guards the same surface as JWT-auth.
async function resolveWorkspaceId(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<number | null> {
  const params = request.params as Record<string, string>;
  const body = request.body as Record<string, unknown> | null;

  let workspaceId = Number(params.workspaceId || (body?.workspaceId as number));

  if (!workspaceId && params.incidentId) {
    const incident = await prisma.incident.findUnique({
      where: { id: Number(params.incidentId) },
      select: { monitor: { select: { workspaceId: true } } },
    });
    if (!incident) {
      reply.status(404).send({ message: "Incident not found" });
      return null;
    }
    workspaceId = incident.monitor.workspaceId;
  }

  if (!workspaceId || Number.isNaN(workspaceId)) {
    reply.status(400).send({ message: "Workspace context missing for authorization" });
    return null;
  }

  return workspaceId;
}

// Accepts EITHER a workspace API key (x-api-key) OR a JWT (Authorization:
// Bearer). Authorizes the caller for the request's target workspace and sets
// request.access. Read endpoints allow any workspace member, so no role
// granularity is needed here — membership existence is sufficient.
export async function requireWorkspaceAccess(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const workspaceId = await resolveWorkspaceId(request, reply);
  if (workspaceId === null) return; // resolveWorkspaceId already replied

  // Machine auth (API key) takes precedence when the header is present.
  const apiKeyHeader = request.headers["x-api-key"];
  if (typeof apiKeyHeader === "string" && apiKeyHeader.length > 0) {
    const key = await prisma.apiKey.findFirst({
      where: { key: apiKeyHeader, isActive: true },
    });

    if (!key) {
      return reply.status(401).send({
        message: "UNAUTHORIZED: API key is invalid or revoked.",
      });
    }

    if (key.workspaceId !== workspaceId) {
      return reply.status(403).send({
        message: "FORBIDDEN: This API key cannot access this workspace.",
      });
    }

    prisma.apiKey
      .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
      .catch(console.error);

    request.access = { workspaceId, mode: "machine", scope: key.scope };
    return;
  }

  // Human auth (JWT).
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({
      message: "Authentication required: provide a Bearer token or x-api-key header.",
    });
  }

  let userId: number;
  try {
    userId = verifyAccessToken(authHeader.split(" ")[1]).userId;
  } catch {
    return reply.status(401).send({ message: "Invalid or expired token" });
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    select: { role: true },
  });

  if (!membership) {
    return reply.status(403).send({ message: "You are not a member of this workspace" });
  }

  request.user = { userId, role: membership.role };
  request.access = { workspaceId, mode: "user", userId };
}

// Service-layer authorization for a specific resource's workspace. The
// middleware authorizes the workspace resolved from the route; this re-checks
// against the actual resource's workspace (e.g. a monitor loaded by id) so a
// tampered id can't reach another workspace's data. Throws on mismatch.
export async function assertWorkspaceAccess(
  access: AccessContext,
  workspaceId: number,
) {
  if (access.mode === "machine") {
    if (access.workspaceId !== workspaceId) {
      throw new Error("You do not have access to this workspace");
    }
    return;
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: access.userId!, workspaceId } },
  });
  if (!membership) {
    throw new Error("You do not have access to this workspace");
  }
}

// Reserved for v1→v2: gate write endpoints so READ_ONLY keys can't mutate.
// Human (JWT) callers pass through — their write authority is handled by
// requireRole on those routes. Not yet wired to any route.
export function requireScope(required: "READ_WRITE") {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const access = request.access;
    if (access?.mode === "machine" && access.scope !== required) {
      return reply.status(403).send({
        message: `FORBIDDEN: This API key is read-only and cannot perform write operations.`,
      });
    }
  };
}
