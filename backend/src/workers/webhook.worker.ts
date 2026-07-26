import { Worker } from "bullmq";
import IORedis from "ioredis";
import axios from "axios";
import crypto from "crypto";
import { prisma } from "../lib/db";
import { assertPublicUrl } from "../lib/ssrf";
import { getAdapter } from "../modules/notifications/notification.dispatch";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

let worker: Worker | null = null;

// Re-attempts a delivery to a notification channel. Throwing lets BullMQ apply
// the configured backoff; returning marks the job done.
async function retryChannelDelivery(job: { data: any; attemptsMade: number }) {
  const { channelId, payload } = job.data;

  const channel = await prisma.notificationChannel.findUnique({
    where: { id: channelId },
  });

  if (!channel || !channel.isActive) {
    console.log(`[Retry Skipped] Channel ${channelId} missing or inactive; dropping job`);
    return { success: true, skipped: true };
  }

  // Respect the circuit breaker — don't keep hammering a benched endpoint.
  if (channel.disabledUntil && channel.disabledUntil > new Date()) {
    console.log(`[Retry Skipped] Channel ${channelId} is paused by the circuit breaker`);
    return { success: true, skipped: true };
  }

  console.log(`[Retry Attempt ${job.attemptsMade + 1}] Channel ${channelId} (${channel.type})`);

  try {
    const result = await getAdapter(channel.type).send(channel.config as any, payload);

    await prisma.$transaction([
      prisma.notificationDeliveryLog.create({
        data: {
          channelId,
          event: payload.event,
          isSuccess: true,
          responseStatus: result.status ?? null,
          detail: result.detail ?? null,
        },
      }),
      prisma.notificationChannel.update({
        where: { id: channelId },
        data: { failureCount: 0, disabledUntil: null, lastDeliveredAt: new Date() },
      }),
    ]);

    return { success: true };
  } catch (error) {
    const err = error as { response?: { status?: number }; message?: string };
    await prisma.notificationDeliveryLog
      .create({
        data: {
          channelId,
          event: payload.event,
          isSuccess: false,
          responseStatus: err.response?.status ?? null,
          detail: (err.message ?? "Unknown error").slice(0, 500),
        },
      })
      .catch(() => {});

    // Rethrow so BullMQ retries with backoff.
    throw error;
  }
}

export function startWebhookRetryWorker() {
  if (worker) return worker;

  worker = new Worker(
    "webhook-logs",
    async (job) => {
      // Notification-channel retries share this queue rather than standing up a
      // second retry mechanism; they're dispatched through the adapter registry.
      if (job.name === "retry-channel-delivery") {
        return retryChannelDelivery(job);
      }

      const { webhookId, url, payload } = job.data;

      const webhook = await prisma.webhookEndpoint.findUnique({
        where: { id: webhookId },
      });

      if (!webhook || !webhook.isActive) {
        console.log(
          `[Retry Skipped] Webhook ${webhookId} missing or inactive; dropping job`,
        );
        return { success: true, skipped: true };
      }

      const body = JSON.stringify(payload);
      const signature = crypto
        .createHmac("sha256", webhook.secret || "")
        .update(body)
        .digest("hex");

      console.log(`[Retry Attempt ${job.attemptsMade + 1}] Hitting ${url}`);

      let responseStatus: number | null = null;
      let responseBody: string | null = null;
      let isSuccess = false;

      try {
        await assertPublicUrl(url);

        const response = await axios.post(url, payload, {
          timeout: 5000,
          maxRedirects: 0,
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "PulseOps-Webhook/1.0",
            "X-PulseOps-Signature": signature,
            "X-PulseOps-Event": payload.event,
            "X-PulseOps-Timestamp": payload.timestamp,
          },
        });

        isSuccess = true;
        responseStatus = response.status;
        responseBody =
          typeof response.data === "string"
            ? response.data
            : JSON.stringify(response.data);
      } catch (err) {
        const error = err as {
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

        await prisma.webhookDeliveryLog.create({
          data: {
            webhookId,
            url,
            requestPayload: payload as any,
            responseStatus,
            responseBody,
            isSuccess: false,
          },
        });

        throw err;
      }

      await prisma.webhookDeliveryLog.create({
        data: {
          webhookId,
          url,
          requestPayload: payload as any,
          responseStatus,
          responseBody,
          isSuccess,
        },
      });

      return { success: true };
    },
    { connection },
  );

  worker.on("completed", (job) => {
    console.log(`Webhook retry job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, error) => {
    console.log(`Webhook retry job ${job?.id} failed:`, error.message);

    // Final attempt exhausted. Previously this was logged and forgotten, with
    // no operator-visible signal that a webhook had permanently stopped being
    // delivered. The delivery log row carries the detail; this makes the
    // give-up itself explicit.
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      console.error(
        `[WEBHOOK_RETRY] GIVING UP on job ${job.id} after ${job.attemptsMade} attempts — ` +
          `endpoint ${job.data?.url} is not accepting deliveries: ${error.message}`,
      );
    }
  });

  console.log("[WEBHOOK_RETRY] Worker started");
  return worker;
}

// Closes the worker (waiting for in-flight jobs) and its Redis connection.
export async function stopWebhookRetryWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }
  await connection.quit().catch(() => {});
}
