import type { CreateMonitorInput, UpdateMonitorInput } from "./monitor.schema";
import { prisma } from "../../lib/db";
import axios from "axios";
import { monitorCheckQueue } from "../../queues/monitor.queue";

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

  const monitor = await prisma.monitor.create({
    data: {
      workspaceId,
      name: input.name,
      url: input.url,
      method: input.method,
      intervalSeconds: input.intervalSeconds,
      timeoutMs: input.timeoutMs,
      expectedStatus: input.expectedStatus,
    },
  });

  return monitor;
}

export async function getWorkspaceMonitorsService(
  userId: number,
  workspaceId: number,
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

async function handleIncidentTransition(
  monitorId: number,
  oldStatus: string,
  newStatus: string,
) {
  if (oldStatus !== "DOWN" && newStatus === "DOWN") {
    await prisma.incident.create({
      data: {
        monitorId,
        title: `Monitor ${monitorId} is down`,
        status: "OPEN",
      },
    });
  }

  if (oldStatus === "DOWN" && newStatus === "UP") {
    await prisma.incident.updateMany({
      where: {
        monitorId,
        status: "OPEN",
      },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });
  }
}

export async function runMonitorCheckService(monitorId: number) {
  const monitor = await prisma.monitor.findUnique({
    where: {
      id: monitorId,
    },
  });

  if (!monitor) {
    throw new Error("Monitor not found");
  }

  const startTime = Date.now();

  try {
    const response = await axios.request({
      method: monitor.method,
      url: monitor.url,
      timeout: monitor.timeoutMs,
      validateStatus: () => true,
    });

    const responseTimeMs = Date.now() - startTime;

    const status = response.status === monitor.expectedStatus ? "UP" : "DOWN";

    await handleIncidentTransition(monitor.id, monitor.status, status);

    const check = await prisma.monitorCheck.create({
      data: {
        monitorId: monitor.id,
        status,
        statusCode: response.status,
        responseTimeMs,
      },
    });

    await prisma.monitor.update({
      where: {
        id: monitor.id,
      },
      data: {
        status,
        lastCheckedAt: new Date(),
      },
    });

    return check;
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;

    await handleIncidentTransition(monitor.id, monitor.status, "DOWN");

    const check = await prisma.monitorCheck.create({
      data: {
        monitorId: monitor.id,
        status: "DOWN",
        responseTimeMs,
        errorMessage: error instanceof Error ? error.message : "Request failed",
      },
    });

    await prisma.monitor.update({
      where: {
        id: monitor.id,
      },
      data: {
        status: "DOWN",
        lastCheckedAt: new Date(),
      },
    });

    return check;
  }
}

export async function getMonitorChecksService(
  userId: number,
  monitorId: number,
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
    throw new Error("You do not have access to this monitor");
  }

  const checks = await prisma.monitorCheck.findMany({
    where: {
      monitorId,
    },
    orderBy: {
      checkedAt: "desc",
    },
  });

  return checks;
}

export async function getMonitorStatsService(
  userId: number,
  monitorId: number,
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
    throw new Error("You do not have access to this monitor");
  }

  const checks = await prisma.monitorCheck.findMany({
    where: {
      monitorId,
    },
    orderBy: {
      checkedAt: "desc",
    },
  });

  const totalChecks = checks.length;

  const upChecks = checks.filter((check) => check.status === "UP").length;
  const downChecks = checks.filter((check) => check.status === "DOWN").length;

  const uptimePercentage =
    totalChecks === 0 ? 0 : (upChecks / totalChecks) * 100;

  const checksWithResponseTime = checks.filter(
    (check) => check.responseTimeMs !== null,
  );

  const averageResponseTimeMs =
    checksWithResponseTime.length === 0
      ? 0
      : checksWithResponseTime.reduce(
          (sum, check) => sum + check.responseTimeMs!,
          0,
        ) / checksWithResponseTime.length;

  const latestStatus = checks[0]?.status ?? monitor.status;

  return {
    totalChecks,
    upChecks,
    downChecks,
    uptimePercentage,
    averageResponseTimeMs,
    latestStatus,
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

export async function enqueueMonitorCheckService(
  userId: number,
  monitorId: number,
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

  const job = await monitorCheckQueue.add("run-check", {
    monitorId,
  });

  return {
    jobId: job.id,
    monitorId,
    status: "queued",
  };
}
