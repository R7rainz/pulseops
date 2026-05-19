import { FastifyReply } from "fastify";
import { FastifyRequest } from "fastify/types/request";
import { createMonitorSchema } from "./monitor.schema";
import {
  createMonitorService,
  getWorkspaceMonitorsService,
} from "./monitor.service";

type CreateMonitorParams = {
  workspaceId: string;
};

export async function createMonitorController(
  request: FastifyRequest<{ Params: CreateMonitorParams }>,
  response: FastifyReply,
) {
  const workspaceID = request.params.workspaceId;
  const numWorkspaceID = parseInt(workspaceID);
  if (Number.isNaN(numWorkspaceID)) {
    return response.status(400).send({
      message: "Invalid workspace Id",
    });
  }

  const body = createMonitorSchema.parse(request.body);
  const monitor = await createMonitorService(
    request.user.userId,
    numWorkspaceID,
    body,
  );

  return response.status(201).send({
    message: "Monitor created successfully",
    data: monitor,
  });
}

export async function getWorkspaceMonitorsController(
  request: FastifyRequest<{ Params: CreateMonitorParams }>,
  response: FastifyReply,
) {
  const workspaceID = request.params.workspaceId;
  const numWorkspaceID = parseInt(workspaceID);

  if (Number.isNaN(numWorkspaceID)) {
    return response.status(400).send({
      message: "Invalid workspace id",
    });
  }

  const monitors = await getWorkspaceMonitorsService(
    request.user.userId,
    numWorkspaceID,
  );

  return response.status(200).send({
    message: "Monitors fetched successfully",
    data: monitors,
  });
}
