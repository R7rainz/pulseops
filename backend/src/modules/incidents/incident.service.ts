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

export async function getIncidentByIdService(
  userId: number,
  incidentId: number,
) {
  const incident = await prisma.incident.findUnique({
    where: {
      id: incidentId,
    },
    include: {
      monitor: {
        select: {
          id: true,
          name: true,
          url: true,
          status: true,
          workspaceId: true,
        },
      },
    },
  });
  if (!incident) throw new Error("Incident not found");

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: incident.monitor.workspaceId,
      },
    },
  });
  if (!membership) throw new Error("You do not have access to this incident");
  return incident;
}

export async function acknowledgeIncidentService(
  userId: number,
  incidentId: number,
) {
  const incident = await prisma.incident.findUnique({
    where: {
      id: incidentId,
    },
    include: {
      monitor: {
        select: {
          id: true,
          name: true,
          url: true,
          status: true,
          workspaceId: true,
        },
      },
    },
  });
  if (!incident) throw new Error("Incident not found");

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: incident.monitor.workspaceId,
      },
    },
  });
  if (!membership) throw new Error("You do not have access to this incident");
  if (incident.status === "RESOLVED")
    throw new Error("Cannot acknowledge resolved incident");

  const updatedIncident = await prisma.incident.update({
    where: {
      id: incidentId,
    },
    data: {
      status: "ACKNOWLEDGED",
    },
    include: {
      monitor: {
        select: {
          id: true,
          name: true,
          url: true,
          status: true,
          workspaceId: true,
        },
      },
    },
  });
  return updatedIncident;
}

export async function resolveIncidentService(
  userId: number,
  incidentId: number,
) {
  const incident = await prisma.incident.findUnique({
    where: {
      id: incidentId,
    },
    include: {
      monitor: {
        select: {
          id: true,
          name: true,
          url: true,
          status: true,
          workspaceId: true,
        },
      },
    },
  });

  if (!incident) {
    throw new Error("Incident not found");
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: incident.monitor.workspaceId,
      },
    },
  });

  if (!membership) {
    throw new Error("You do not have access to this incident");
  }

  if (incident.status === "RESOLVED") {
    throw new Error("Incident is already resolved");
  }

  const updatedIncident = await prisma.incident.update({
    where: {
      id: incidentId,
    },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
    },
    include: {
      monitor: {
        select: {
          id: true,
          name: true,
          url: true,
          status: true,
          workspaceId: true,
        },
      },
    },
  });

  return updatedIncident;
}
