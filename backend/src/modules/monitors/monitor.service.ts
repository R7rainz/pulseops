import { CreateMonitorInput } from "./monitor.schema";
import { prisma } from "../../lib/db";

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
