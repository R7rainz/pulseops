import { prisma } from "../../lib/db";
import { sendWebhookNotifications } from "../webhooks/webhook.delivery";
import {
  assertWorkspaceAccess,
  assertWorkspaceRole,
  type AccessContext,
} from "../../middleware/workspace-access.middleware";
import { dispatchNotification } from "../notifications/notification.dispatch";

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

  // Role must be checked against the incident's own workspace, not the one in
  // the request path.
  await assertWorkspaceRole(userId, incident.monitor.workspaceId);

  if (incident.status === "RESOLVED")
    throw new Error("Cannot acknowledge resolved incident");

  const acknowledgedAt = new Date();

  const updatedIncident = await prisma.incident.update({
    where: {
      id: incidentId,
    },
    data: {
      status: "ACKNOWLEDGED",
      // Records who took ownership — the status existed with no actor.
      acknowledgedAt,
      acknowledgedBy: userId,
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

  dispatchNotification(updatedIncident.monitor.workspaceId, {
    event: "incident.acknowledged",
    incidentId: updatedIncident.id,
    monitorId: updatedIncident.monitor.id,
    workspaceId: updatedIncident.monitor.workspaceId,
    monitorName: updatedIncident.monitor.name,
    monitorUrl: updatedIncident.monitor.url,
    status: updatedIncident.monitor.status,
    title: updatedIncident.title,
    message: `Incident acknowledged for [${updatedIncident.monitor.name}] — someone is investigating.`,
    timestamp: acknowledgedAt.toISOString(),
  }).catch((err) => console.error("[INCIDENT] Acknowledge notification failed:", err));

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

  // Role checked against the incident's own workspace, not the request path.
  await assertWorkspaceRole(userId, incident.monitor.workspaceId);

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

  const resolvedAt = updatedIncident.resolvedAt ?? new Date();
  const message = `Incident manually resolved for monitor: ${updatedIncident.monitor.name}`;

  await sendWebhookNotifications(incident.monitor.workspaceId, {
    event: "incident.resolved",
    incidentId: updatedIncident.id,
    monitorId: updatedIncident.monitor.id,
    workspaceId: updatedIncident.monitor.workspaceId,
    message,
    timestamp: resolvedAt.toISOString(),
  });

  dispatchNotification(updatedIncident.monitor.workspaceId, {
    event: "incident.resolved",
    incidentId: updatedIncident.id,
    monitorId: updatedIncident.monitor.id,
    workspaceId: updatedIncident.monitor.workspaceId,
    monitorName: updatedIncident.monitor.name,
    monitorUrl: updatedIncident.monitor.url,
    status: updatedIncident.monitor.status,
    title: updatedIncident.title,
    message,
    timestamp: resolvedAt.toISOString(),
    durationMs: resolvedAt.getTime() - updatedIncident.startedAt.getTime(),
  }).catch((err) => console.error("[INCIDENT] Resolve notification failed:", err));

  return updatedIncident;
}
