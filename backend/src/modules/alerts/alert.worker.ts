import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { sendWebhookNotifications } from "../webhooks/webhook.delivery";
import { AlertJobPayload } from "./alert.queue";

const connection = new IORedis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
});

const worker = new Worker<AlertJobPayload>(
    "alerts",
    async (job) => {
        const { type, workspaceId, monitorId, incidentId, monitorName, monitorUrl, details } = job.data;
        console.log(`[ALERT WORKER] Processing ${type} for Workspace ${workspaceId}`);

        let message: string;
        let event: "incident.opened" | "incident.resolved";

        if (type === "INCIDENT_OPENED") {
            message = `URGENT OUTAGE: ${monitorName} (${monitorUrl}) is DOWN.\nReason: ${details}`;
            event = "incident.opened";
        } else {
            message = `SYSTEM RECOVERY: ${monitorName} (${monitorUrl}) is back ONLINE.\nDetails: ${details}`;
            event = "incident.resolved";
        }

        await sendWebhookNotifications(workspaceId, {
            event,
            incidentId,
            monitorId,
            workspaceId,
            message,
            timestamp: new Date().toISOString(),
        });

        return { success: true };
    },
    { connection }
);

worker.on("completed", (job) => {
    console.log(`Alert job ${job.id} dispatched successfully to workspace channel`);
});

worker.on("failed", (job, error) => {
    console.log(`Alert job ${job?.id} failed to deliver:`, error.message);
});

console.log("Alert worker started — listening for BullMQ alert jobs");
