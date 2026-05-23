import { FastifyReply, FastifyRequest } from "fastify";
import { getWorkspaceIncidentsService } from "./incident.service";

type WorkspaceIncidentParams = {
  workspaceId: string;
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
