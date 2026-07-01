import { Worker } from "bullmq";
import IORedis from "ioredis";
import axios from "axios";
import crypto from "crypto";
import { prisma } from "../lib/db";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

let worker: Worker | null = null;

export function startWebhookRetryWorker() {
  if (worker) return worker;

  worker = new Worker(
    "webhook-logs",
    async (job) => {
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
        const response = await axios.post(url, payload, {
          timeout: 5000,
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
  });

  console.log("[WEBHOOK_RETRY] Worker started");
  return worker;
}
