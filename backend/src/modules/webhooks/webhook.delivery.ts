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
    //findmany never returns null it returns an array so it can be empty
    where: {
      workspaceId,
      isActive: true,
    },
  });

  //early return if there are no webhooks
  if (webhooks.length === 0) {
    return;
  }
  const requests = webhooks.map((webhook) => {
    return axios.post(webhook.url, payload, {
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "PulseOps-Webhook/1.0",
      },
    });
  });

  const results = await Promise.allSettled(requests);

  const logEntries = results.map((result, index) => {
    const webhook = webhooks[index];
    let responseStatus: number | null = null;
    let responseBody: string | null = null;

    if (result.status === "fulfilled") {
      responseStatus = result.value.status;
      responseBody =
        typeof result.value.data === "string"
          ? result.value.data
          : JSON.stringify(result.value.data);
    } else {
      const error = result.reason;
      responseStatus = error.response?.status || null;

      if (error.response?.data) {
        responseBody =
          typeof error.response.data === "string"
            ? error.response.data
            : JSON.stringify(error.response.data);
      } else {
        responseBody = error.message;
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

  await prisma.webhookDeliveryLog.createMany({
    data: logEntries,
  });

  // Replace your existing results.forEach with this:
  results.forEach(async (result, index) => {
    if (result.status === "rejected") {
      const webhook = webhooks[index];
      console.log(
        `[Webhook Failed] URL: ${webhook.url} | Queuing for retry...`,
      );

      // Toss it into the retry queue with Exponential Backoff
      await webhookLogsQueue.add(
        "retry-delivery",
        {
          webhookId: webhook.id,
          url: webhook.url,
          payload: payload,
        },
        {
          attempts: 5, // Try 5 times total
          backoff: {
            type: "exponential",
            delay: 60_000, // Wait 1 minute, then 2 mins, then 4 mins...
          },
        },
      );
    }
  });
};
