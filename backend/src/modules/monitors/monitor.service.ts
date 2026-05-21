import { CreateMonitorInput } from "./monitor.schema";
import { prisma } from "../../lib/db";
import axios from "axios";

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
  if (!membership) throw new Error("You do not have access to this workspace");

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
  if (!membership) throw new Error("You do not have access to this workspace");

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

export async function runMonitorCheckService(
  userId: number,
  monitorId: number,
) {
  const monitor = await prisma.monitor.findUnique({
    where: {
      id: monitorId,
    },
  });

  if (!monitor) throw new Error("Monitor not found");

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: monitor.workspaceId,
      },
    },
  });
  if (!membership) throw new Error("You do not have access to this workspace");

  const startTime = Date.now();
  //axios request will go here
  try {
    //decide status
    const response = await axios.request({
      method: monitor.method,
      url: monitor.url,
      timeout: monitor.timeoutMs,
      //By default Axios throws on 4xx and 5xx. For monitoring, we don’t want that. We want to receive the status code and decide ourselves whether it is UP or DOWN.
      validateStatus: () => true,
    });
    const responseTimeMs = Date.now() - startTime;
    // create MonitorCheck
    const status = response.status === monitor.expectedStatus ? "UP" : "DOWN";
    const check = await prisma.monitorCheck.create({
      data: {
        monitorId: monitor.id,
        status,
        statusCode: response.status,
        responseTimeMs,
      },
    });
    // update Monitor
    await prisma.monitor.update({
      where: {
        id: monitor.id,
      },
      data: {
        status,
      },
    });
    // return check
    return check;
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;

    //create failed MonitorCheck
    const check = await prisma.monitorCheck.create({
      data: {
        monitorId: monitor.id,
        status: "DOWN",
        responseTimeMs,
        errorMessage: error instanceof Error ? error.message : "Request failed",
      },
    });
    // update monitor to DOWN
    await prisma.monitor.update({
      where: {
        id: monitor.id,
      },
      data: {
        status: "DOWN",
      },
    });
    // return check
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

  if (!monitor) throw new Error("Monitor not found");

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: monitor.workspaceId,
      },
    },
  });

  if (!membership) throw new Error("You do not have access to this monitor");

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
  if (!monitor) throw new Error("Monitor not found");

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: monitor.workspaceId,
      },
    },
  });

  if (!membership) throw new Error("You do not have access to this monitor");

  const checks = await prisma.monitorCheck.findMany({
    where: { monitorId },
    orderBy: { checkedAt: "desc" },
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
