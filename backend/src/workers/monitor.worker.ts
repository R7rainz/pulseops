import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { runMonitorCheckService } from "../modules/monitors/monitor.service";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "monitor-checks",
  async (job) => {
    const { monitorId } = job.data as {
      monitorId: number;
    };

    console.log(`Running monitor check job ${job.id}`, { monitorId });

    const result = await runMonitorCheckService(monitorId);
    return result;
  },
  {
    connection,
  },
);

worker.on("completed", (job) => {
  console.log(`Monitor check job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.log(`Monitor check job ${job?.id} failed`, error);
});

console.log("Monitor worker started");
