import { kafka, kafkaConsumer, kafkaProducer } from "../../lib/kafka";
import { prisma } from "../../lib/db";
import { redis } from "../../lib/redis";
import { applyCheckResult, type PingResult } from "../monitors/monitor.engine";

// Shape published by workers/ping-engine (engine/worker.go Result struct).
type GoPingResult = {
    target_id: number;
    workspace_id: number;
    status_code: number;
    latency: number; // nanoseconds — Go time.Duration marshals as an int64
    is_up: boolean;
    error?: string;
    tls_issuer?: string;
    tls_days_left?: number;
    tls_valid?: boolean;
    tls_error?: string;
    timestamp: string;
};

// Results that can't be applied end up here rather than being silently dropped.
const DLQ_TOPIC_SUFFIX = ".dlq";

// How long a result's dedup marker lives. Comfortably longer than any
// redelivery window, far shorter than the check interval matters.
const DEDUP_TTL_SECONDS = 900;

// Applying a result mutates consecutiveFailures, so a redelivered message would
// increment it a second time and could open a spurious incident. Kafka is
// at-least-once, and enabling manual commits (below) makes redelivery *more*
// likely, so results are deduped on (monitor, produced-at) before being applied.
async function alreadyApplied(payload: GoPingResult): Promise<boolean> {
    const key = `check-applied:${payload.target_id}:${payload.timestamp}`;
    try {
        // NX returns null when the key already exists — i.e. we've seen this one.
        const won = await redis.set(key, "1", "EX", DEDUP_TTL_SECONDS, "NX");
        return won === null;
    } catch {
        // Redis unavailable: prefer applying a possible duplicate over dropping
        // a real result. Duplicates cost an extra failure increment; drops lose
        // the outage entirely.
        return false;
    }
}

async function sendToDlq(topic: string, value: Buffer, reason: string) {
    try {
        await kafkaProducer.send({
            topic: `${topic}${DLQ_TOPIC_SUFFIX}`,
            messages: [
                {
                    value,
                    headers: {
                        "x-error": reason,
                        "x-failed-at": new Date().toISOString(),
                    },
                },
            ],
        });
    } catch (error) {
        console.error("[METRICS_CONSUMER] Could not write to DLQ:", (error as Error).message);
    }
}

export async function startMetricsConsumer() {
    const topic = process.env.KAFKA_METRICS_TOPIC;
    if (!topic) {
        console.error("[METRICS_CONSUMER] KAFKA_METRICS_TOPIC is not set — skipping subscribe");
        return;
    }

    try {
        await kafkaConsumer.subscribe({ topic, fromBeginning: false });

        console.log("[METRICS_CONSUMER] Listening for ping results from the Go engine");

        await kafkaConsumer.run({
            // Offsets are committed explicitly, only after a message has been
            // applied or deliberately parked in the DLQ. With kafkajs's default
            // autoCommit, a transient DB failure advanced the offset anyway and
            // the check result was lost silently.
            autoCommit: false,
            eachBatch: async ({
                batch,
                resolveOffset,
                heartbeat,
                commitOffsetsIfNecessary,
                isRunning,
                isStale,
            }) => {
                for (const message of batch.messages) {
                    if (!isRunning() || isStale()) break;

                    if (!message.value) {
                        resolveOffset(message.offset);
                        continue;
                    }

                    let payload: GoPingResult;
                    try {
                        payload = JSON.parse(message.value.toString());
                    } catch (error) {
                        // Unparseable will never parse — park it and move on
                        // rather than blocking the partition forever.
                        console.error("[METRICS_CONSUMER] Unparseable message -> DLQ:", error);
                        await sendToDlq(batch.topic, message.value, "unparseable-json");
                        resolveOffset(message.offset);
                        continue;
                    }

                    try {
                        if (await alreadyApplied(payload)) {
                            resolveOffset(message.offset);
                            continue;
                        }

                        // Re-fetch fresh — the monitor's state may have changed since it
                        // was dispatched (paused, deleted, threshold/status updated, etc).
                        const monitor = await prisma.monitor.findUnique({
                            where: { id: payload.target_id },
                        });

                        if (!monitor || !monitor.isActive) {
                            resolveOffset(message.offset);
                            continue;
                        }

                        const pingResult: PingResult = {
                            isUp: payload.is_up,
                            statusCode: payload.status_code,
                            latencyMs: Math.round(payload.latency / 1_000_000),
                            errorMessage: payload.error || null,
                            tlsIssuer: payload.tls_issuer || null,
                            tlsDaysRemaining: payload.tls_days_left ?? null,
                            tlsValidTo:
                                payload.tls_days_left != null
                                    ? new Date(Date.now() + payload.tls_days_left * 86_400_000)
                                    : null,
                            tlsValid: payload.tls_valid ?? null,
                            tlsError: payload.tls_error || null,
                        };

                        await applyCheckResult(monitor, pingResult);
                        resolveOffset(message.offset);
                    } catch (error) {
                        // Do NOT resolve the offset: leaving it unresolved means
                        // this message is redelivered instead of lost. Breaking
                        // out preserves ordering within the partition.
                        console.error(
                            `[METRICS_CONSUMER] Failed to apply result for target ${payload.target_id} — will retry:`,
                            (error as Error).message,
                        );
                        break;
                    }

                    await heartbeat();
                }

                await commitOffsetsIfNecessary();
            },
        });
    } catch (err) {
        console.error("[METRICS_CONSUMER] Not available — Kafka not connected:", (err as Error).message);
    }
}
