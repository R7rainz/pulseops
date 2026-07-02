import { prisma } from "../../lib/db";
import { sendWebhookNotifications } from "../webhooks/webhook.delivery";
import {
  assertWorkspaceAccess,
  type AccessContext,
} from "../../middleware/workspace-access.middleware";

export async function getWorkspaceIncidentsService(
  access: AccessContext,
  workspaceId: number,
) {
  await assertWorkspaceAccess(access, workspaceId);

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
  access: AccessContext,
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

  await assertWorkspaceAccess(access, incident.monitor.workspaceId);
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

  await sendWebhookNotifications(incident.monitor.workspaceId, {
    event: "incident.resolved",
    incidentId: updatedIncident.id,
    monitorId: updatedIncident.monitor.id,
    workspaceId: updatedIncident.monitor.workspaceId,
    message: `Incident manually resolved for monitor: ${updatedIncident.monitor.name}`,
    timestamp: new Date().toISOString(),
  });

  return updatedIncident;
}
