import { Queue } from "bullmq"
import IORedis from "ioredis"

const connection = new IORedis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
})

export interface AlertJobPayload {
    type: "INCIDENT_OPENED" | "INCIDENT_RESOLVED"
    workspaceId: number
    monitorId: number
    incidentId: number
    monitorName: string
    monitorUrl: string
    details: string
}

export const alertQueue = new Queue<AlertJobPayload>("alerts", {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: true,
    },
})
