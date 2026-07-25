import { prisma } from "../../lib/db";
import { withLeaderLock } from "../../lib/leader-lock";

// MonitorCheck grows without bound — at the 30s minimum interval one monitor
// writes ~2.9M rows/year. This job keeps it finite:
//
//   1. roll finished days up into MonitorCheckDaily (cheap, idempotent)
//   2. delete raw rows older than the retention window, in batches
//
// Long-range views read the rollups, so dropping the raw rows loses only
// per-check granularity beyond the window, not uptime history.

const RETENTION_DAYS = Number(process.env.CHECK_RETENTION_DAYS ?? 30);

// Deleting millions of rows in one statement holds locks for far too long.
const DELETE_BATCH_SIZE = 10_000;
const MAX_BATCHES_PER_RUN = 200;

let retentionInterval: NodeJS.Timeout | null = null;

/**
 * Rolls up every day that is complete and not yet rolled up.
 *
 * Idempotent: the unique (monitorId, day) index plus ON CONFLICT means
 * re-running recomputes rather than duplicating, so a partial run is safe to
 * repeat. Only days strictly before today are rolled up, since today is still
 * accumulating checks.
 */
export async function rollupDailyChecks(): Promise<number> {
    const result = await prisma.$executeRaw`
        INSERT INTO "MonitorCheckDaily" (
            "monitorId", "day", "totalChecks", "upChecks", "downChecks",
            "degradedChecks", "avgResponseMs", "minResponseMs", "maxResponseMs",
            "p50ResponseMs", "p95ResponseMs", "p99ResponseMs"
        )
        SELECT
            "monitorId",
            date_trunc('day', "checkedAt")::date                                    AS day,
            COUNT(*)                                                                 AS total,
            COUNT(*) FILTER (WHERE status = 'UP')                                    AS up,
            COUNT(*) FILTER (WHERE status = 'DOWN')                                  AS down,
            COUNT(*) FILTER (WHERE status = 'DEGRADED')                              AS degraded,
            ROUND(AVG("responseTimeMs") FILTER (WHERE status = 'UP'))::int           AS avg_ms,
            MIN("responseTimeMs") FILTER (WHERE status = 'UP')                       AS min_ms,
            MAX("responseTimeMs") FILTER (WHERE status = 'UP')                       AS max_ms,
            PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY "responseTimeMs")
                FILTER (WHERE status = 'UP' AND "responseTimeMs" IS NOT NULL)::int   AS p50,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "responseTimeMs")
                FILTER (WHERE status = 'UP' AND "responseTimeMs" IS NOT NULL)::int   AS p95,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY "responseTimeMs")
                FILTER (WHERE status = 'UP' AND "responseTimeMs" IS NOT NULL)::int   AS p99
        FROM "MonitorCheck"
        WHERE "checkedAt" < date_trunc('day', NOW())
        GROUP BY "monitorId", date_trunc('day', "checkedAt")::date
        ON CONFLICT ("monitorId", "day") DO UPDATE SET
            "totalChecks"    = EXCLUDED."totalChecks",
            "upChecks"       = EXCLUDED."upChecks",
            "downChecks"     = EXCLUDED."downChecks",
            "degradedChecks" = EXCLUDED."degradedChecks",
            "avgResponseMs"  = EXCLUDED."avgResponseMs",
            "minResponseMs"  = EXCLUDED."minResponseMs",
            "maxResponseMs"  = EXCLUDED."maxResponseMs",
            "p50ResponseMs"  = EXCLUDED."p50ResponseMs",
            "p95ResponseMs"  = EXCLUDED."p95ResponseMs",
            "p99ResponseMs"  = EXCLUDED."p99ResponseMs"
    `;

    return result;
}

/**
 * Deletes raw checks older than the retention window, in bounded batches.
 *
 * Only runs against days that have already been rolled up, so raw data is never
 * dropped before its summary exists.
 */
export async function pruneOldChecks(): Promise<number> {
    let deletedTotal = 0;

    for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch++) {
        const deleted = await prisma.$executeRaw`
            DELETE FROM "MonitorCheck"
            WHERE "id" IN (
                SELECT c."id"
                FROM "MonitorCheck" c
                WHERE c."checkedAt" < date_trunc('day', NOW()) - ${`${RETENTION_DAYS} days`}::interval
                  AND EXISTS (
                        SELECT 1 FROM "MonitorCheckDaily" d
                        WHERE d."monitorId" = c."monitorId"
                          AND d."day" = date_trunc('day', c."checkedAt")::date
                  )
                LIMIT ${DELETE_BATCH_SIZE}
            )
        `;

        deletedTotal += deleted;
        if (deleted < DELETE_BATCH_SIZE) break;
    }

    return deletedTotal;
}

async function runRetentionCycle() {
    const rolled = await rollupDailyChecks();
    const pruned = await pruneOldChecks();

    if (rolled > 0 || pruned > 0) {
        console.log(
            `[RETENTION] Rolled up ${rolled} monitor-day(s); pruned ${pruned} raw check(s) older than ${RETENTION_DAYS}d`,
        );
    }
}

export function startRetentionScheduler(intervalMs = 6 * 60 * 60 * 1000) {
    if (retentionInterval) return;

    if (RETENTION_DAYS <= 0) {
        console.log("[RETENTION] CHECK_RETENTION_DAYS <= 0 — retention disabled, raw checks kept forever");
        return;
    }

    console.log(
        `[RETENTION] Rolling up and pruning checks older than ${RETENTION_DAYS}d every ${intervalMs / 3600000}h`,
    );

    // Leader-locked like the other periodic jobs: only one replica should be
    // rolling up and deleting. TTL is generous because a prune over a large
    // backlog can take a while.
    const tick = () =>
        withLeaderLock("check-retention", 30 * 60 * 1000, runRetentionCycle).catch((error) =>
            console.error("[RETENTION] Cycle failed:", error),
        );

    // Deliberately not run at boot — a restart loop would otherwise hammer the
    // database with prune scans.
    retentionInterval = setInterval(tick, intervalMs);
}

export function stopRetentionScheduler() {
    if (retentionInterval) {
        clearInterval(retentionInterval);
        retentionInterval = null;
        console.log("[RETENTION] Scheduler stopped.");
    }
}
