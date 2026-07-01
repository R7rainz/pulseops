import { prisma } from "../../lib/db";
import { kafkaProducer } from "../../lib/kafka";

let dispatchInterval: NodeJS.Timeout | null = null;

async function dispatchDueMonitors() {
    const monitors = await prisma.monitor.findMany({
        where: {
            isActive: true,
            OR: [
                { status: { not: "PAUSED" } },
                {
                    status: "PAUSED",
                    maintenanceStartAt: { lte: new Date() },
                    maintenanceEndAt: { gte: new Date() },
                },
            ],
        },
        select: {
            id: true,
            url: true,
            method: true,
            expectedStatus: true,
            timeoutMs: true,
            workspaceId: true,
            intervalSeconds: true,
            lastCheckedAt: true,
        },
    });

    const nowMs = Date.now();
    const dueMonitors = monitors.filter((monitor) => {
        const lastCheckedAtMs = monitor.lastCheckedAt?.getTime();
        return !lastCheckedAtMs || nowMs - lastCheckedAtMs >= monitor.intervalSeconds * 1000;
    });

    if (dueMonitors.length === 0) return;

    const topic = process.env.KAFKA_TARGETS_TOPIC;
    if (!topic) {
        console.error("[SCHEDULER] KAFKA_TARGETS_TOPIC is not set — cannot dispatch monitors");
        return;
    }

    await kafkaProducer.send({
        topic,
        messages: dueMonitors.map((monitor) => ({
            key: monitor.workspaceId.toString(), // keeps per-workspace ordering on one partition
            value: JSON.stringify({
                id: monitor.id,
                url: monitor.url,
                method: monitor.method,
                expected_status: monitor.expectedStatus,
                timeout_ms: monitor.timeoutMs,
                workspace_id: monitor.workspaceId,
            }),
        })),
    });

    console.log(`[SCHEDULER] Dispatched ${dueMonitors.length} due monitor(s) to Kafka`);
}

export function startMonitorDispatchScheduler(intervalMs = 15000) {
    if (dispatchInterval) return;

    console.log(`[SCHEDULER] Dispatching due monitors to Kafka every ${intervalMs / 1000}s`);

    dispatchDueMonitors().catch((error) => console.error("[SCHEDULER] Dispatch tick failed:", error));

    dispatchInterval = setInterval(() => {
        dispatchDueMonitors().catch((error) => console.error("[SCHEDULER] Dispatch tick failed:", error));
    }, intervalMs);
}

export function stopMonitorDispatchScheduler() {
    if (dispatchInterval) {
        clearInterval(dispatchInterval);
        dispatchInterval = null;
        console.log("[SCHEDULER] Dispatch loop stopped.");
    }
}
