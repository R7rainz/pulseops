import crypto from "crypto";
import axios from "axios";
import { prisma } from "../../lib/db";
import { webhookLogsQueue } from "./webhook.queue";

export interface WebhookPayload {
  event: "incident.opened" | "incident.resolved";
  incidentId: number;
  monitorId: number;
  workspaceId: number;
  message: string;
  timestamp: string;
}

export const sendWebhookNotifications = async (
  workspaceId: number,
  payload: WebhookPayload,
) => {
  const webhooks = await prisma.webhookEndpoint.findMany({
    where: { workspaceId, isActive: true },
  });

  if (webhooks.length === 0) return;

  const matchedWebhooks = webhooks.filter((wh) => {
    try {
      const events: string[] = JSON.parse(wh.events);
      return events.includes(payload.event);
    } catch {
      return true;
    }
  });

  if (matchedWebhooks.length === 0) return;

  const requests = matchedWebhooks.map((webhook) => {
    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", webhook.secret || "")
      .update(body)
      .digest("hex");

    return axios.post(webhook.url, payload, {
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "PulseOps-Webhook/1.0",
        "X-PulseOps-Signature": signature,
        "X-PulseOps-Event": payload.event,
        "X-PulseOps-Timestamp": payload.timestamp,
      },
    });
  });

  const results = await Promise.allSettled(requests);

  const logEntries = results.map((result, index) => {
    const webhook = matchedWebhooks[index];
    let responseStatus: number | null = null;
    let responseBody: string | null = null;

    if (result.status === "fulfilled") {
      responseStatus = result.value.status;
      responseBody =
        typeof result.value.data === "string"
          ? result.value.data
          : JSON.stringify(result.value.data);
    } else {
      const error = result.reason as {
        response?: { status?: number; data?: unknown };
        message?: string;
      };
      responseStatus = error.response?.status || null;

      if (error.response?.data) {
        responseBody =
          typeof error.response.data === "string"
            ? error.response.data
            : JSON.stringify(error.response.data);
      } else {
        responseBody = error.message || "Unknown error";
      }
    }

    return {
      webhookId: webhook.id,
      url: webhook.url,
      requestPayload: payload as any,
      responseStatus,
      responseBody,
      isSuccess: result.status === "fulfilled",
    };
  });

  await prisma.webhookDeliveryLog.createMany({ data: logEntries });

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      const webhook = matchedWebhooks[i];
      console.log(`[Webhook Failed] URL: ${webhook.url} | Queuing for retry...`);

      await webhookLogsQueue.add(
        "retry-delivery",
        { webhookId: webhook.id, url: webhook.url, payload },
        { attempts: 5, backoff: { type: "exponential", delay: 60_000 } },
      );
    }
  }
};
