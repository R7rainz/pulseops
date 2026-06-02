import type { FastifyRequest, FastifyReply } from "fastify";
import { createApiKeySchema } from "./api-key.schema";
import {
  createApiKeyService,
  getApiKeysService,
  revokeApiKeyService,
} from "./api-key.service";

export async function createApiKeyController(
  request: FastifyRequest<{ Params: { workspaceId: string } }>,
  response: FastifyReply,
) {
  try {
    const workspaceId = Number(request.params.workspaceId);
    const body = createApiKeySchema.parse(request.body);
    const apiKey = await createApiKeyService(
      request.user.userId,
      workspaceId,
      body,
    );

    return response.status(201).send({
      message: "API key created successfully",
      data: apiKey,
    });
  } catch (error) {
    return response.status(400).send({
      message:
        error instanceof Error ? error.message : "Failed to create API key",
    });
  }
}

export async function getApiKeysController(
  request: FastifyRequest<{ Params: { workspaceId: string } }>,
  response: FastifyReply,
) {
  try {
    const workspaceId = Number(request.params.workspaceId);
    const apiKeys = await getApiKeysService(
      request.user.userId,
      workspaceId,
    );

    return response.status(200).send({
      message: "API keys fetched successfully",
      data: apiKeys,
    });
  } catch (error) {
    return response.status(400).send({
      message:
        error instanceof Error ? error.message : "Failed to fetch API keys",
    });
  }
}

export async function revokeApiKeyController(
  request: FastifyRequest<{ Params: { keyId: string } }>,
  response: FastifyReply,
) {
  try {
    const keyId = Number(request.params.keyId);
    await revokeApiKeyService(request.user.userId, keyId);

    return response.status(200).send({
      message: "API key revoked successfully",
    });
  } catch (error) {
    return response.status(400).send({
      message:
        error instanceof Error ? error.message : "Failed to revoke API key",
    });
  }
}
