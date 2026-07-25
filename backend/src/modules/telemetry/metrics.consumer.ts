import { kafkaConsumer } from "../../lib/kafka";
import { prisma } from "../../lib/db";
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
            eachMessage: async ({ message }) => {
                if (!message.value) return;

                let payload: GoPingResult;
                try {
                    payload = JSON.parse(message.value.toString());
                } catch (error) {
                    console.error("[METRICS_CONSUMER] Dropped unparseable message:", error);
                    return;
                }

                try {
                    // Re-fetch fresh — the monitor's state may have changed since it
                    // was dispatched (paused, deleted, threshold/status updated, etc).
                    const monitor = await prisma.monitor.findUnique({
                        where: { id: payload.target_id },
                    });

                    if (!monitor || !monitor.isActive) return;

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
                } catch (error) {
                    console.error(`[METRICS_CONSUMER] Failed to apply result for target ${payload.target_id}:`, error);
                }
            },
        });
    } catch (err) {
        console.error("[METRICS_CONSUMER] Not available — Kafka not connected:", (err as Error).message);
    }
}
