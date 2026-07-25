import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
    // Fail fast rather than queueing forever. With `null` (the ioredis "retry
    // indefinitely" setting) a Redis outage didn't surface as an error — the
    // command just never settled, so the check-now cooldown hung the request
    // and /health hung on ping() instead of reporting degraded.
    //
    // Every caller of this client treats Redis as a cache and degrades
    // gracefully on rejection, so a fast error is strictly better than a hang.
    // NOTE: BullMQ requires maxRetriesPerRequest: null and therefore keeps its
    // own connections (see webhook.queue.ts / webhook.worker.ts).
    // A brief reconnect is absorbed by the offline queue; once reconnect
    // attempts exceed this, queued commands reject instead of waiting forever.
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redis.on("connect", () => {
    console.log("[REDIS] Connected to Cache Layer.");
});

redis.on("error", (err) => {
    console.error("[REDIS] Connection Failure:", err);
});
