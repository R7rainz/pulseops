import type { CreateMonitorInput, UpdateMonitorInput } from "./monitor.schema";
import { prisma } from "../../lib/db";
import { checkMonitor } from "./monitor.engine";
import {
    assertWorkspaceAccess,
    type AccessContext,
} from "../../middleware/workspace-access.middleware";

export async function createMonitorService(
    userId: number,
    workspaceId: number,
    input: CreateMonitorInput,
) {
    const membership = await prisma.workspaceMember.findUnique({
        where: {
            userId_workspaceId: {
                userId,
                workspaceId,
            },
        },
    });

    if (!membership) {
        throw new Error("You do not have access to this workspace");
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

    const membership = await prisma.workspaceMember.findUnique({
        where: {
            userId_workspaceId: {
                userId,
                workspaceId: monitor.workspaceId,
            },
        },
    });

    if (!membership) {
        throw new Error("You do not have access to this workspace");
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

function percentile(sortedAsc: number[], p: number): number {
    if (sortedAsc.length === 0) return 0;
    const index = Math.min(sortedAsc.length - 1, Math.ceil((p / 100) * sortedAsc.length) - 1);
    return sortedAsc[Math.max(0, index)];
}

function computeStats(checks: { status: string; responseTimeMs: number | null }[]) {
    const totalChecks = checks.length;
    const upChecks = checks.filter((c) => c.status === "UP").length;
    const downChecks = checks.filter((c) => c.status === "DOWN").length;
    const degradedChecks = checks.filter((c) => c.status === "DEGRADED").length;
    const uptimePercentage = totalChecks === 0 ? 0 : (upChecks / totalChecks) * 100;

    // Only healthy (UP) checks count toward latency — a DOWN/DEGRADED check's timing
    // reflects a timeout/failure, not real response performance.
    const upLatencies = checks
        .filter((c) => c.status === "UP" && c.responseTimeMs !== null)
        .map((c) => c.responseTimeMs!)
        .sort((a, b) => a - b);

    const averageResponseTimeMs = upLatencies.length === 0
        ? 0
        : upLatencies.reduce((s, v) => s + v, 0) / upLatencies.length;

    return {
        totalChecks,
        upChecks,
        downChecks,
        degradedChecks,
        uptimePercentage: Math.round(uptimePercentage * 100) / 100,
        averageResponseTimeMs: Math.round(averageResponseTimeMs * 100) / 100,
        p50ResponseTimeMs: Math.round(percentile(upLatencies, 50) * 100) / 100,
        p95ResponseTimeMs: Math.round(percentile(upLatencies, 95) * 100) / 100,
        p99ResponseTimeMs: Math.round(percentile(upLatencies, 99) * 100) / 100,
    };
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

    const allChecks = await prisma.monitorCheck.findMany({
        where: { monitorId },
        orderBy: { checkedAt: "desc" },
    });

    const now = new Date();
    const range24h = allChecks.filter(c => c.checkedAt.getTime() > now.getTime() - 86400000);
    const range30d = allChecks.filter(c => c.checkedAt.getTime() > now.getTime() - 2592000000);

    const latestStatus = allChecks[0]?.status ?? monitor.status;

    return {
        ...computeStats(allChecks),
        latestStatus,
        range24h: computeStats(range24h),
        range30d: computeStats(range30d),
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

    const membership = await prisma.workspaceMember.findUnique({
        where: {
            userId_workspaceId: {
                userId,
                workspaceId: monitor.workspaceId,
            },
        },
    });

    if (!membership) {
        throw new Error("You do not have access to this workspace");
    }

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

    const membership = await prisma.workspaceMember.findUnique({
        where: {
            userId_workspaceId: {
                userId,
                workspaceId: monitor.workspaceId,
            },
        },
    });

    if (!membership) {
        throw new Error("You do not have access to this workspace");
    }

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

    const membership = await prisma.workspaceMember.findUnique({
        where: {
            userId_workspaceId: {
                userId,
                workspaceId: monitor.workspaceId,
            },
        },
    });

    if (!membership) {
        throw new Error("You do not have access to this workspace");
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

    const membership = await prisma.workspaceMember.findUnique({
        where: {
            userId_workspaceId: {
                userId,
                workspaceId: monitor.workspaceId,
            },
        },
    });

    if (!membership) {
        throw new Error("You do not have access to this workspace");
    }

    const deletedMonitor = await prisma.monitor.delete({
        where: {
            id: monitorId,
        },
    });

    return deletedMonitor;
}

