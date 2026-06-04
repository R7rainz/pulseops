import { FastifyRequest, FastifyReply } from "fastify";
import {
  createWebhookService,
  deleteWebhookService,
  getWebhookDeliveryLogsService,
  getWorkspaceWebhooksService,
} from "./webhook.service";
import { createWebhookSchema } from "./webhook.schema";

type WorkspaceWebhookParams = {
  workspaceId: string;
};

type WebhookParams = {
  webhookId: string;
};

export async function createWebhookController(
  request: FastifyRequest<{ Params: WorkspaceWebhookParams }>,
  response: FastifyReply,
) {
  const workspaceId = Number(request.params.workspaceId);
  if (Number.isNaN(workspaceId)) {
    return response.status(400).send({
      message: "Invalid workspace id",
    });
  }
  const body = createWebhookSchema.parse(request.body);

  const createdWebhook = await createWebhookService(
    request.user.userId,
    workspaceId,
    body,
  );

  return response.status(201).send({
    message: "Webhook endpoint created successfully",
    data: createdWebhook,
  });
}

export async function getWorkspaceWebhooksController(
  request: FastifyRequest<{ Params: WorkspaceWebhookParams }>,
  response: FastifyReply,
) {
  const workspaceId = Number(request.params.workspaceId);

  if (Number.isNaN(workspaceId)) {
    return response.status(400).send({
      message: "Invalid workspace id",
    });
  }

  const workspaceWebhooks = await getWorkspaceWebhooksService(
    request.user.userId,
    workspaceId,
  );

  return response.status(200).send({
    message: "Workspace webhooks fetched successfully",
    data: workspaceWebhooks,
  });
}

export async function deleteWebhookController(
  request: FastifyRequest<{ Params: WebhookParams }>,
  response: FastifyReply,
) {
  const webhookId = Number(request.params.webhookId);

  if (Number.isNaN(webhookId)) {
    return response.status(400).send({
      message: "Invalid webhook id",
    });
  }

  const deletedWebhook = await deleteWebhookService(
    request.user.userId,
    webhookId,
  );

  return response.status(200).send({
    message: "Webhook deleted successfully",
    data: deletedWebhook,
  });
}

export async function getWebhookDeliveryLogsController(
  request: FastifyRequest<{ Params: WebhookParams }>,
  response: FastifyReply,
) {
  const webhookId = Number(request.params.webhookId);

  if (Number.isNaN(webhookId)) {
    return response.status(400).send({
      message: "Invalid webhook id",
    });
  }

  const logs = await getWebhookDeliveryLogsService(
    request.user.userId,
    webhookId,
  );

  return response.status(200).send({
    message: "Webhook delivery logs fetched successfully",
    data: logs,
  });
}
