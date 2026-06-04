import { prisma } from "../../lib/db";
import type { CreateWebhookInput } from "./webhook.schema";

export async function createWebhookService(
  userId: number,
  workspaceId: number,
  input: CreateWebhookInput,
) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });

  if (!membership) throw new Error("You do not have access to this workspace");

  const webhook = await prisma.webhookEndpoint.create({
    data: {
      workspaceId,
      url: input.url,
    },
  });

  return webhook;
}

export async function getWorkspaceWebhooksService(
  userId: number,
  workspaceId: number,
) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });
  if (!membership) throw new Error("You do not have access to this workspace");

  const webhooks = await prisma.webhookEndpoint.findMany({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return webhooks;
}

export async function deleteWebhookService(userId: number, webhookId: number) {
  const webhook = await prisma.webhookEndpoint.findUnique({
    where: {
      id: webhookId,
    },
  });

  if (!webhook) {
    throw new Error("Webhook not found");
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: webhook.workspaceId,
      },
    },
  });

  if (!membership) {
    throw new Error("You do not have access to this workspace");
  }

  const deletedWebhook = await prisma.webhookEndpoint.delete({
    where: {
      id: webhookId,
    },
  });

  return deletedWebhook;
}

export async function getWebhookDeliveryLogsService(
  userId: number,
  webhookId: number,
) {
  const webhook = await prisma.webhookEndpoint.findUnique({
    where: { id: webhookId },
  });

  if (!webhook) throw new Error("Webhook not found");

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: webhook.workspaceId,
      },
    },
  });

  if (!membership) throw new Error("You do not have access to this webhook");

  const logs = await prisma.webhookDeliveryLog.findMany({
    where: { webhookId },
    orderBy: { createdAt: "desc" },
  });

  return logs;
}
