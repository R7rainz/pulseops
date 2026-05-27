import axios from "axios";
import { prisma } from "../../lib/db";

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

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        `[Webhook Failed] URL: ${webhooks[index].url} | Error: ${result.reason.message}`,
      );
    }
  });
};
