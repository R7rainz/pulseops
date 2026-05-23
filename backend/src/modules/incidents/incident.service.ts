import { prisma } from "../../lib/db";

export async function getWorkspaceIncidentsService(
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

  //querying through incidents and this works as - Incident belongs to Monitor. Monitor belongs to Workspace. So we filter incidents through monitor.workspaceId.
  const incidents = await prisma.incident.findMany({
    where: {
      monitor: {
        workspaceId,
      },
    },
    include: {
      monitor: {
        select: {
          id: true,
          name: true,
          url: true,
          status: true,
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
  });
  return incidents;
}
