import { FastifyRequest, FastifyReply } from "fastify";
import {
  createWebhookService,
  updateWebhookService,
  deleteWebhookService,
  getWebhookDeliveryLogsService,
  getWorkspaceWebhooksService,
  toggleWebhookService,
  testWebhookService,
} from "./webhook.service";
import { createWebhookSchema, updateWebhookSchema } from "./webhook.schema";

type WsParams = { workspaceId: string };
type WhParams = { workspaceId: string; webhookId: string };

export async function createWebhookController(
  request: FastifyRequest<{ Params: WsParams }>,
  response: FastifyReply,
) {
  const workspaceId = Number(request.params.workspaceId);
  if (Number.isNaN(workspaceId)) {
    return response.status(400).send({ message: "Invalid workspace id" });
  }

  const body = createWebhookSchema.parse(request.body);
  const created = await createWebhookService(request.user.userId, workspaceId, body);

  return response.status(201).send({
    message: "Webhook endpoint created successfully",
    data: created,
  });
}

export async function getWorkspaceWebhooksController(
  request: FastifyRequest<{ Params: WsParams }>,
  response: FastifyReply,
) {
  const workspaceId = Number(request.params.workspaceId);
  if (Number.isNaN(workspaceId)) {
    return response.status(400).send({ message: "Invalid workspace id" });
  }

  const webhooks = await getWorkspaceWebhooksService(request.user.userId, workspaceId);

  return response.status(200).send({
    message: "Workspace webhooks fetched successfully",
    data: webhooks,
  });
}

export async function updateWebhookController(
  request: FastifyRequest<{ Params: WhParams }>,
  response: FastifyReply,
) {
  const webhookId = Number(request.params.webhookId);
  if (Number.isNaN(webhookId)) {
    return response.status(400).send({ message: "Invalid webhook id" });
  }

  const body = updateWebhookSchema.parse(request.body);
  const updated = await updateWebhookService(request.user.userId, webhookId, body);

  return response.status(200).send({
    message: "Webhook updated successfully",
    data: updated,
  });
}

export async function deleteWebhookController(
  request: FastifyRequest<{ Params: WhParams }>,
  response: FastifyReply,
) {
  const webhookId = Number(request.params.webhookId);
  if (Number.isNaN(webhookId)) {
    return response.status(400).send({ message: "Invalid webhook id" });
  }

  await deleteWebhookService(request.user.userId, webhookId);

  return response.status(200).send({
    message: "Webhook deleted successfully",
  });
}

export async function toggleWebhookController(
  request: FastifyRequest<{ Params: WhParams }>,
  response: FastifyReply,
) {
  const webhookId = Number(request.params.webhookId);
  if (Number.isNaN(webhookId)) {
    return response.status(400).send({ message: "Invalid webhook id" });
  }

  const updated = await toggleWebhookService(request.user.userId, webhookId);

  return response.status(200).send({
    message: updated.isActive ? "Webhook enabled" : "Webhook disabled",
    data: updated,
  });
}

export async function testWebhookController(
  request: FastifyRequest<{ Params: WhParams }>,
  response: FastifyReply,
) {
  const webhookId = Number(request.params.webhookId);
  if (Number.isNaN(webhookId)) {
    return response.status(400).send({ message: "Invalid webhook id" });
  }

  const result = await testWebhookService(request.user.userId, webhookId);

  return response.status(result.isSuccess ? 200 : 502).send({
    message: result.isSuccess
      ? "Test ping delivered successfully"
      : "Test ping failed",
    data: result,
  });
}

export async function getWebhookDeliveryLogsController(
  request: FastifyRequest<{ Params: WhParams }>,
  response: FastifyReply,
) {
  const webhookId = Number(request.params.webhookId);
  if (Number.isNaN(webhookId)) {
    return response.status(400).send({ message: "Invalid webhook id" });
  }

  const query = request.query as { skip?: string; take?: string };
  const skip = Math.max(0, Number(query.skip) || 0);
  const take = Math.min(100, Math.max(1, Number(query.take) || 20));

  const result = await getWebhookDeliveryLogsService(
    request.user.userId,
    webhookId,
    skip,
    take,
  );

  return response.status(200).send({
    message: "Webhook delivery logs fetched successfully",
    data: result,
  });
}
