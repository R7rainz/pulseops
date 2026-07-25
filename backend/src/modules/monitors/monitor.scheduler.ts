import { prisma } from "../../lib/db";
import { kafkaProducer } from "../../lib/kafka";
import { withLeaderLock } from "../../lib/leader-lock";

let dispatchInterval: NodeJS.Timeout | null = null;

// A monitor already dispatched but with no result yet is considered in flight
// and is not re-dispatched, unless it has been stuck this long — which means
// the result was lost (engine crash, dropped Kafka message) and it should be
// retried rather than stall forever.
const DISPATCH_STALE_AFTER_MS = 5 * 60 * 1000;

// Timestamp of the last tick that actually dispatched (or found nothing to
// dispatch) without erroring. Read by the readiness probe: a Kafka outage
// otherwise leaves the app reporting healthy while silently running no checks.
let lastSuccessfulDispatchAt: Date | null = null;

export function getLastSuccessfulDispatchAt(): Date | null {
    return lastSuccessfulDispatchAt;
}

type DueMonitor = {
    id: number;
    url: string;
    method: string;
    expectedStatus: number;
    timeoutMs: number;
    workspaceId: number;
};

async function dispatchDueMonitors() {
    const topic = process.env.KAFKA_TARGETS_TOPIC;
    if (!topic) {
        console.error("[SCHEDULER] KAFKA_TARGETS_TOPIC is not set — cannot dispatch monitors");
        return;
    }

    // Select *and* claim in one statement. Previously every active monitor in
    // the system was loaded on each 15s tick and filtered for due-ness in
    // application memory; now Postgres does it via the
    // (isActive, nextCheckAt) index.
    //
    // Setting dispatchedAt/nextCheckAt as part of the same UPDATE is what makes
    // the claim atomic: a monitor slower than the tick interval can no longer
    // be dispatched twice, and two replicas racing here cannot both claim the
    // same row.
    const claimed = await prisma.$queryRaw<DueMonitor[]>`
        UPDATE "Monitor" m
        SET "dispatchedAt" = NOW(),
            "nextCheckAt"  = NOW() + ("intervalSeconds" || ' seconds')::interval
        WHERE m."id" IN (
            SELECT c."id"
            FROM "Monitor" c
            WHERE c."isActive" = TRUE
              AND c."type" = 'HTTP'
              AND (c."nextCheckAt" IS NULL OR c."nextCheckAt" <= NOW())
              AND (
                    c."dispatchedAt" IS NULL
                 OR c."dispatchedAt" < NOW() - ${`${DISPATCH_STALE_AFTER_MS} milliseconds`}::interval
              )
              AND (
                    c."status" <> 'PAUSED'
                 OR (c."maintenanceStartAt" <= NOW() AND c."maintenanceEndAt" >= NOW())
              )
            ORDER BY c."nextCheckAt" NULLS FIRST
            FOR UPDATE SKIP LOCKED
        )
        RETURNING m."id",
                  m."url",
                  m."method",
                  m."expectedStatus",
                  m."timeoutMs",
                  m."workspaceId"
    `;

    if (claimed.length === 0) {
        lastSuccessfulDispatchAt = new Date();
        return;
    }

    try {
        await kafkaProducer.send({
            topic,
            messages: claimed.map((monitor) => ({
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
    } catch (error) {
        // The claim already moved nextCheckAt forward, so release it — otherwise
        // a Kafka blip would silently skip a whole interval for these monitors.
        await prisma.monitor.updateMany({
            where: { id: { in: claimed.map((m) => m.id) } },
            data: { dispatchedAt: null, nextCheckAt: new Date() },
        }).catch(() => {});
        throw error;
    }

    lastSuccessfulDispatchAt = new Date();
    console.log(`[SCHEDULER] Dispatched ${claimed.length} due monitor(s) to Kafka`);
}

export function startMonitorDispatchScheduler(intervalMs = 15000) {
    if (dispatchInterval) return;

    console.log(`[SCHEDULER] Dispatching due monitors to Kafka every ${intervalMs / 1000}s`);

    // Only one replica dispatches per tick. The lock TTL is just under the tick
    // interval so a crashed holder can't block the next one.
    const tick = () =>
        withLeaderLock("monitor-dispatch", intervalMs - 1000, dispatchDueMonitors).catch(
            (error) => console.error("[SCHEDULER] Dispatch tick failed:", error),
        );

    tick();
    dispatchInterval = setInterval(tick, intervalMs);
}

export function stopMonitorDispatchScheduler() {
    if (dispatchInterval) {
        clearInterval(dispatchInterval);
        dispatchInterval = null;
        console.log("[SCHEDULER] Dispatch loop stopped.");
    }
}
