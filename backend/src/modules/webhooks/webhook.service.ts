import crypto from "crypto";
import axios from "axios";
import { prisma } from "../../lib/db";
import type { CreateWebhookInput, UpdateWebhookInput } from "./webhook.schema";

function ensureMembership(userId: number, workspaceId: number) {
  return prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
}

export async function createWebhookService(
  userId: number,
  workspaceId: number,
  input: CreateWebhookInput,
) {
  const membership = await ensureMembership(userId, workspaceId);
  if (!membership) throw new Error("You do not have access to this workspace");

  const secret = crypto.randomBytes(16).toString("hex");

  const webhook = await prisma.webhookEndpoint.create({
    data: {
      workspaceId,
      url: input.url,
      name: input.name || "",
      events: JSON.stringify(input.events || ["incident.opened", "incident.resolved"]),
      secret,
      isActive: true,
    },
  });

  return webhook;
}

export async function getWorkspaceWebhooksService(
  userId: number,
  workspaceId: number,
) {
  const membership = await ensureMembership(userId, workspaceId);
  if (!membership) throw new Error("You do not have access to this workspace");

  const webhooks = await prisma.webhookEndpoint.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      url: true,
      events: true,
      isActive: true,
      lastTestedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return webhooks.map((w) => ({
    ...w,
    events: JSON.parse(w.events),
  }));
}

export async function updateWebhookService(
  userId: number,
  webhookId: number,
  input: UpdateWebhookInput,
) {
  const webhook = await prisma.webhookEndpoint.findUnique({
    where: { id: webhookId },
  });
  if (!webhook) throw new Error("Webhook not found");

  const membership = await ensureMembership(userId, webhook.workspaceId);
  if (!membership) throw new Error("You do not have access to this workspace");

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.url !== undefined) data.url = input.url;
  if (input.events !== undefined) data.events = JSON.stringify(input.events);
  if (input.isActive !== undefined) data.isActive = input.isActive;

  const updated = await prisma.webhookEndpoint.update({
    where: { id: webhookId },
    data,
  });

  const { secret: _secret, ...rest } = updated;
  return { ...rest, events: JSON.parse(updated.events) };
}

export async function deleteWebhookService(userId: number, webhookId: number) {
  const webhook = await prisma.webhookEndpoint.findUnique({
    where: { id: webhookId },
  });
  if (!webhook) throw new Error("Webhook not found");

  const membership = await ensureMembership(userId, webhook.workspaceId);
  if (!membership) throw new Error("You do not have access to this workspace");

  return prisma.webhookEndpoint.delete({ where: { id: webhookId } });
}

export async function toggleWebhookService(userId: number, webhookId: number) {
  const webhook = await prisma.webhookEndpoint.findUnique({
    where: { id: webhookId },
  });
  if (!webhook) throw new Error("Webhook not found");

  const membership = await ensureMembership(userId, webhook.workspaceId);
  if (!membership) throw new Error("You do not have access to this workspace");

  const updated = await prisma.webhookEndpoint.update({
    where: { id: webhookId },
    data: { isActive: !webhook.isActive },
  });

  const { secret: _secret, ...rest } = updated;
  return { ...rest, events: JSON.parse(updated.events) };
}

export async function testWebhookService(userId: number, webhookId: number) {
  const webhook = await prisma.webhookEndpoint.findUnique({
    where: { id: webhookId },
  });
  if (!webhook) throw new Error("Webhook not found");

  const membership = await ensureMembership(userId, webhook.workspaceId);
  if (!membership) throw new Error("You do not have access to this workspace");

  const payload = {
    event: "test",
    message: "This is a test ping from PulseOps. Your webhook is configured correctly.",
    timestamp: new Date().toISOString(),
  };

  const signature = crypto
    .createHmac("sha256", webhook.secret || "")
    .update(JSON.stringify(payload))
    .digest("hex");

  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let isSuccess = false;

  try {
    const res = await axios.post(webhook.url, payload, {
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "PulseOps-Webhook/1.0",
        "X-PulseOps-Signature": signature,
        "X-PulseOps-Event": "test",
      },
    });
    responseStatus = res.status;
    responseBody = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    isSuccess = true;
  } catch (err: unknown) {
    const error = err as { response?: { status?: number; data?: unknown }; message?: string };
    responseStatus = error.response?.status || null;
    responseBody = error.response?.data
      ? typeof error.response.data === "string"
        ? error.response.data
        : JSON.stringify(error.response.data)
      : error.message || "Unknown error";
  }

  await prisma.webhookDeliveryLog.create({
    data: {
      webhookId,
      url: webhook.url,
      requestPayload: payload,
      responseStatus,
      responseBody,
      isSuccess,
    },
  });

  await prisma.webhookEndpoint.update({
    where: { id: webhookId },
    data: { lastTestedAt: new Date() },
  });

  return { isSuccess, responseStatus, responseBody };
}

export async function getWebhookDeliveryLogsService(
  userId: number,
  webhookId: number,
  skip = 0,
  take = 20,
) {
  const webhook = await prisma.webhookEndpoint.findUnique({
    where: { id: webhookId },
  });
  if (!webhook) throw new Error("Webhook not found");

  const membership = await ensureMembership(userId, webhook.workspaceId);
  if (!membership) throw new Error("You do not have access to this webhook");

  const [logs, total] = await Promise.all([
    prisma.webhookDeliveryLog.findMany({
      where: { webhookId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.webhookDeliveryLog.count({ where: { webhookId } }),
  ]);

  return { logs, total, skip, take };
}
