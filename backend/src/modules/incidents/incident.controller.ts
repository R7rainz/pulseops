import { FastifyReply, FastifyRequest } from "fastify";
import {
  acknowledgeIncidentService,
  getIncidentByIdService,
  getWorkspaceIncidentsService,
  resolveIncidentService,
} from "./incident.service";

type WorkspaceIncidentParams = {
  workspaceId: string;
};

type IncidentParams = {
  incidentId: string;
};

export async function getWorkspaceIncidentsController(
  request: FastifyRequest<{ Params: WorkspaceIncidentParams }>,
  response: FastifyReply,
) {
  const workspaceId = Number(request.params.workspaceId);
  if (Number.isNaN(workspaceId)) {
    return response.status(400).send({
      message: "Workspace id is invalid",
    });
  }

  const incidents = await getWorkspaceIncidentsService(
    request.user.userId,
    workspaceId,
  );
  return response.status(200).send({
    message: "Incidents fetched successfully",
    data: incidents,
  });
}

export async function getIncidentByIdController(
  request: FastifyRequest<{ Params: IncidentParams }>,
  response: FastifyReply,
) {
  const incidentId = Number(request.params.incidentId);
  if (Number.isNaN(incidentId)) {
    return response.status(400).send({
      message: "Invalid incident id",
    });
  }

  const incident = await getIncidentByIdService(
    request.user.userId,
    incidentId,
  );

  return response.status(200).send({
    message: "Incident fetched successfully",
    data: incident,
  });
}

export async function acknowledgeIncidentController(
  request: FastifyRequest<{ Params: IncidentParams }>,
  response: FastifyReply,
) {
  try {
    const incidentId = Number(request.params.incidentId);

    if (Number.isNaN(incidentId)) {
      return response.status(400).send({
        message: "Invalid incident id",
      });
    }

    const acknowledgedIncident = await acknowledgeIncidentService(
      request.user.userId,
      incidentId,
    );

    return response.status(200).send({
      message: "Incident acknowledged successfully",
      data: acknowledgedIncident,
    });
  } catch (error) {
    return response.status(400).send({
      message:
        error instanceof Error
          ? error.message
          : "Failed to acknowledge incident",
    });
  }
}

export async function resolveIncidentController(
  request: FastifyRequest<{ Params: IncidentParams }>,
  response: FastifyReply,
) {
  try {
    const incidentId = Number(request.params.incidentId);

    if (Number.isNaN(incidentId)) {
      return response.status(400).send({
        message: "Invalid incident id",
      });
    }
    const resolvedIncident = await resolveIncidentService(
      request.user.userId,
      incidentId,
    );
    return response.status(200).send({
      message: "Incident resolved successfully",
      data: resolvedIncident,
    });
  } catch (error) {
    return response.status(400).send({
      message:
        error instanceof Error ? error.message : "Failed to resolve incident",
    });
  }
}
