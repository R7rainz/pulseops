import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/db";

declare module "fastify" {
  interface FastifyRequest {
    machineAuth?: {
      workspaceId: number;
      keyId: number;
    };
  }
}

export async function requireApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const apiKeyHeader = request.headers["x-api-key"];

  if (!apiKeyHeader || typeof apiKeyHeader !== "string") {
    return reply.status(401).send({
      message: "UNAUTHORIZED: Missing or invalid x-api-key header.",
    });
  }

  const apiKeyRecord = await prisma.apiKey.findFirst({
    where: {
      key: apiKeyHeader,
      isActive: true,
    },
  });

  if (!apiKeyRecord) {
    return reply.status(401).send({
      message: "UNAUTHORIZED: API key is invalid or revoked.",
    });
  }

  prisma.apiKey
    .update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(console.error);

  request.machineAuth = {
    workspaceId: apiKeyRecord.workspaceId,
    keyId: Number(apiKeyRecord.key),
  };
}
