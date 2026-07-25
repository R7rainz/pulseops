import type { CreateMonitorInput, UpdateMonitorInput } from "./monitor.schema";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/db";
import { redis } from "../../lib/redis";
import { assertPublicUrl } from "../../lib/ssrf";
import { checkMonitor } from "./monitor.engine";
import {
    assertWorkspaceAccess,
    assertWorkspaceRole,
    type AccessContext,
} from "../../middleware/workspace-access.middleware";

export async function createMonitorService(
    userId: number,
    workspaceId: number,
    input: CreateMonitorInput,
) {
    await assertWorkspaceRole(userId, workspaceId);

    // Reject unreachable/internal targets at save time so the user gets a clear
    // error instead of a monitor that silently fails every check. The probe
    // re-validates before each request — this is UX, not the security boundary.
    if (input.type !== "HEARTBEAT" && input.url) {
        await assertPublicUrl(input.url);
    }

    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { planTier: true },
    });

    if (!workspace) {
        throw new Error("Workspace not found");
    }

    if (workspace.planTier === "FREE") {
        const activeCount = await prisma.monitor.count({
            where: { workspaceId },
        });

        if (activeCount >= 5) {
            throw new Error("FREE tier limited to 5 monitors. Upgrade to PRO for unlimited monitoring.");
        }
    }

    const isHeartbeat = input.type === "HEARTBEAT";

    const monitor = await prisma.monitor.create({
        data: {
            workspaceId,
            name: input.name,
            type: input.type,
            // Heartbeat monitors are push-based and have no URL to ping.
            url: isHeartbeat ? "" : input.url!,
            method: input.method,
            intervalSeconds: input.intervalSeconds,
            timeoutMs: input.timeoutMs,
            expectedStatus: input.expectedStatus,
            gracePeriodSeconds: input.gracePeriodSeconds,
        },
    });

    return monitor;
}

export async function getWorkspaceMonitorsService(
    access: AccessContext,
    workspaceId: number,
) {
    await assertWorkspaceAccess(access, workspaceId);

    const monitors = await prisma.monitor.findMany({
        where: {
            workspaceId,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return monitors;
}

// Minimum gap between on-demand "check now" runs for a single monitor. A
// manual re-check sooner than this carries no new information and only adds
// load on the target site and our DB.
const MANUAL_CHECK_COOLDOWN_SECONDS = 15;

export async function runMonitorCheckNowService(
    userId: number,
    monitorId: number,
) {
    const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
    });

    if (!monitor) {
        throw new Error("Monitor not found");
    }

    // Role must be re-checked against the *monitor's* workspace, not the one in
    // the request path — otherwise an ADMIN of another workspace could mutate
    // this monitor with only VIEWER rights here.
    await assertWorkspaceRole(userId, monitor.workspaceId);

    // Per-monitor cooldown: at most one manual check per window, shared across
    // every user/tab/instance (keyed by monitor, not requester), so spamming
    // "check now" can't hammer the target site or flood our own pipeline.
    // SET NX EX is atomic — whoever wins the set owns this window.
    const cooldownKey = `monitor:${monitorId}:manual-check-cooldown`;
    const acquired = await redis.set(
        cooldownKey,
        "1",
        "EX",
        MANUAL_CHECK_COOLDOWN_SECONDS,
        "NX",
    );

    if (acquired !== "OK") {
        const retryInSeconds = Math.max(await redis.ttl(cooldownKey), 1);
        const error = new Error(
            `This monitor was just checked — try again in ${retryInSeconds}s`,
        ) as Error & { statusCode: number };
        error.statusCode = 429;
        throw error;
    }

    return checkMonitor(monitor);
}

export async function getMonitorService(
    access: AccessContext,
    workspaceId: number,
    monitorId: number,
) {
    await assertWorkspaceAccess(access, workspaceId);

    const [monitor, workspace] = await Promise.all([
        prisma.monitor.findFirst({
            where: { id: monitorId, workspaceId },
        }),
        prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { planTier: true },
        }),
    ]);

    if (!monitor) {
        throw new Error("Monitor not found");
    }

    if (workspace?.planTier === "FREE") {
        monitor.tlsIssuer = null;
        monitor.tlsValidTo = null;
        monitor.tlsDaysRemaining = null;
    }

    return monitor;
}

export async function getMonitorChecksService(
    access: AccessContext,
    monitorId: number,
    limit: number,
    offset: number,
) {
    const monitor = await prisma.monitor.findUnique({
        where: {
            id: monitorId,
        },
    });

    if (!monitor) {
        throw new Error("Monitor not found");
    }

    await assertWorkspaceAccess(access, monitor.workspaceId);

    const [checks, total] = await Promise.all([
        prisma.monitorCheck.findMany({
            where: { monitorId },
            orderBy: { checkedAt: "desc" },
            take: limit,
            skip: offset,
        }),
        prisma.monitorCheck.count({ where: { monitorId } }),
    ]);

    return { checks, total };
}

export async function getMonitorStatsService(
    access: AccessContext,
    monitorId: number,
) {
    const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
    });

    if (!monitor) {
        throw new Error("Monitor not found");
    }

    await assertWorkspaceAccess(access, monitor.workspaceId);

    // Aggregate in Postgres rather than loading rows into the heap. The previous
    // implementation did an unbounded findMany and computed percentiles in Node,
    // so a single request on a long-lived monitor pulled its entire history into
    // memory — a slow query and an OOM vector on the same line.
    //
    // All three windows come from one pass using FILTER, and the composite index
    // on (monitorId, checkedAt) serves the range predicates.
    const [row] = await prisma.$queryRaw<StatsRow[]>`
        SELECT
            ${statsAggregates(Prisma.sql`TRUE`)},
            ${statsAggregates(Prisma.sql`"checkedAt" > NOW() - INTERVAL '24 hours'`, "h24_")},
            ${statsAggregates(Prisma.sql`"checkedAt" > NOW() - INTERVAL '30 days'`, "d30_")}
        FROM "MonitorCheck"
        WHERE "monitorId" = ${monitorId}
    `;

    const latest = await prisma.monitorCheck.findFirst({
        where: { monitorId },
        orderBy: { checkedAt: "desc" },
        select: { status: true },
    });

    return {
        ...shapeStats(row, ""),
        latestStatus: latest?.status ?? monitor.status,
        range24h: shapeStats(row, "h24_"),
        range30d: shapeStats(row, "d30_"),
    };
}

type StatsRow = Record<string, number | null>;

// Emits the aggregate expressions for one time window, prefixed so several
// windows can share a single scan.
function statsAggregates(predicate: Prisma.Sql, prefix = "") {
    const col = (name: string) => Prisma.raw(`"${prefix}${name}"`);
    return Prisma.sql`
        COUNT(*) FILTER (WHERE ${predicate})                                          AS ${col("total")},
        COUNT(*) FILTER (WHERE ${predicate} AND status = 'UP')                        AS ${col("up")},
        COUNT(*) FILTER (WHERE ${predicate} AND status = 'DOWN')                      AS ${col("down")},
        COUNT(*) FILTER (WHERE ${predicate} AND status = 'DEGRADED')                  AS ${col("degraded")},
        AVG("responseTimeMs") FILTER (WHERE ${predicate} AND status = 'UP')           AS ${col("avg")},
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY "responseTimeMs")
            FILTER (WHERE ${predicate} AND status = 'UP' AND "responseTimeMs" IS NOT NULL) AS ${col("p50")},
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "responseTimeMs")
            FILTER (WHERE ${predicate} AND status = 'UP' AND "responseTimeMs" IS NOT NULL) AS ${col("p95")},
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY "responseTimeMs")
            FILTER (WHERE ${predicate} AND status = 'UP' AND "responseTimeMs" IS NOT NULL) AS ${col("p99")}
    `;
}

const round2 = (v: unknown) => Math.round(Number(v ?? 0) * 100) / 100;

// Maps one prefixed group of aggregates back to the shape computeStats returned,
// so the API contract is unchanged.
function shapeStats(row: StatsRow | undefined, prefix: string) {
    const get = (name: string) => Number(row?.[`${prefix}${name}`] ?? 0);
    const totalChecks = get("total");
    const upChecks = get("up");

    return {
        totalChecks,
        upChecks,
        downChecks: get("down"),
        degradedChecks: get("degraded"),
        uptimePercentage: totalChecks === 0 ? 0 : round2((upChecks / totalChecks) * 100),
        averageResponseTimeMs: round2(row?.[`${prefix}avg`]),
        p50ResponseTimeMs: round2(row?.[`${prefix}p50`]),
        p95ResponseTimeMs: round2(row?.[`${prefix}p95`]),
        p99ResponseTimeMs: round2(row?.[`${prefix}p99`]),
    };
}

export async function pauseMonitorService(userId: number, monitorId: number) {
    const monitor = await prisma.monitor.findUnique({
        where: {
            id: monitorId,
        },
    });

    if (!monitor) {
        throw new Error("Monitor not found");
    }

    // Role must be re-checked against the *monitor's* workspace, not the one in
    // the request path — otherwise an ADMIN of another workspace could mutate
    // this monitor with only VIEWER rights here.
    await assertWorkspaceRole(userId, monitor.workspaceId);

    const updatedMonitor = await prisma.monitor.update({
        where: {
            id: monitorId,
        },
        data: {
            isActive: false,
            status: "PAUSED",
        },
    });

    return updatedMonitor;
}

export async function resumeMonitorService(userId: number, monitorId: number) {
    const monitor = await prisma.monitor.findUnique({
        where: {
            id: monitorId,
        },
    });

    if (!monitor) {
        throw new Error("Monitor not found");
    }

    // Role must be re-checked against the *monitor's* workspace, not the one in
    // the request path — otherwise an ADMIN of another workspace could mutate
    // this monitor with only VIEWER rights here.
    await assertWorkspaceRole(userId, monitor.workspaceId);

    const updatedMonitor = await prisma.monitor.update({
        where: {
            id: monitorId,
        },
        data: {
            isActive: true,
            status: "UP",
        },
    });

    return updatedMonitor;
}

export async function updateMonitorService(
    userId: number,
    monitorId: number,
    input: UpdateMonitorInput,
) {
    const monitor = await prisma.monitor.findUnique({
        where: {
            id: monitorId,
        },
    });

    if (!monitor) {
        throw new Error("Monitor not found");
    }

    // Role must be re-checked against the *monitor's* workspace, not the one in
    // the request path — otherwise an ADMIN of another workspace could mutate
    // this monitor with only VIEWER rights here.
    await assertWorkspaceRole(userId, monitor.workspaceId);

    if (input.url) {
        await assertPublicUrl(input.url);
    }

    const updatedMonitor = await prisma.monitor.update({
        where: {
            id: monitorId,
        },
        data: input,
    });

    return updatedMonitor;
}

export async function deleteMonitorService(userId: number, monitorId: number) {
    const monitor = await prisma.monitor.findUnique({
        where: {
            id: monitorId,
        },
    });

    if (!monitor) {
        throw new Error("Monitor not found");
    }

    // Role must be re-checked against the *monitor's* workspace, not the one in
    // the request path — otherwise an ADMIN of another workspace could mutate
    // this monitor with only VIEWER rights here.
    await assertWorkspaceRole(userId, monitor.workspaceId);

    const deletedMonitor = await prisma.monitor.delete({
        where: {
            id: monitorId,
        },
    });

    return deletedMonitor;
}

