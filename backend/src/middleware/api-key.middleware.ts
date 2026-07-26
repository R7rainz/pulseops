import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/db";
import { sha256Hex } from "../lib/hash";

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

  // Keys are stored hashed — look up by digest, never by the raw value.
  const apiKeyRecord = await prisma.apiKey.findFirst({
    where: {
      keyHash: sha256Hex(apiKeyHeader),
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
    keyId: apiKeyRecord.id,
  };
}
