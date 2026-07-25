import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

export const webhookLogsQueue = new Queue("webhook-logs", {
  connection,
  defaultJobOptions: {
    // Without these, completed and failed jobs accumulate in Redis forever.
    // Keep a bounded window for debugging delivery problems, then discard.
    removeOnComplete: { count: 1000, age: 24 * 60 * 60 },
    removeOnFail: { count: 5000, age: 7 * 24 * 60 * 60 },
  },
});

// Closed during shutdown — this connection is separate from the shared client
// in lib/redis because BullMQ requires maxRetriesPerRequest: null.
export async function closeWebhookQueue() {
  await webhookLogsQueue.close();
  await connection.quit();
}
