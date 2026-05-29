import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import axios from "axios";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "webhook-logs",
  async (job) => {
    const { webhookId, url, payload } = job.data;

    console.log(`[Retry Attempt ${job.attemptsMade + 1}] Hitting ${url}`);
    await axios.post(url, payload, { timeout: 5000 });

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

console.log("Webhook retry worker started");
