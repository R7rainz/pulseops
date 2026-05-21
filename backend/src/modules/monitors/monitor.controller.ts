import { FastifyReply } from "fastify";
import { FastifyRequest } from "fastify/types/request";
import { createMonitorSchema } from "./monitor.schema";
import {
  createMonitorService,
  getMonitorChecksService,
  getMonitorStatsService,
  getWorkspaceMonitorsService,
  runMonitorCheckService,
} from "./monitor.service";

type CreateMonitorParams = {
  workspaceId: string;
};

type RunMonitorCheckParams = {
  monitorId: string;
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

export async function runMonitorCheckController(
  request: FastifyRequest<{ Params: RunMonitorCheckParams }>,
  response: FastifyReply,
) {
  const monitorId = Number(request.params.monitorId);
  if (Number.isNaN(monitorId)) {
    return response.status(400).send({
      message: "Invalid monitor id",
    });
  }

  const check = await runMonitorCheckService(request.user.userId, monitorId);

  return response.status(200).send({
    message: "Monitor check completed successfully",
    data: check,
  });
}

export async function getMonitorChecksController(
  request: FastifyRequest<{ Params: RunMonitorCheckParams }>,
  response: FastifyReply,
) {
  const monitorId = Number(request.params.monitorId);
  if (Number.isNaN(monitorId)) {
    return response.status(400).send({
      message: "Invalid monitor id",
    });
  }
  const checks = await getMonitorChecksService(request.user.userId, monitorId);
  return response.status(200).send({
    message: "Monitor check fetched successfully",
    data: checks,
  });
}

export async function getMonitorStatsController(
  request: FastifyRequest<{ Params: RunMonitorCheckParams }>,
  response: FastifyReply,
) {
  const monitorId = Number(request.params.monitorId);
  if (Number.isNaN(monitorId)) {
    return response.status(400).send({
      message: "Invalid monitor id",
    });
  }

  const stats = await getMonitorStatsService(request.user.userId, monitorId);
  return response.status(200).send({
    message: "Monitor stats fetched successfully",
    data: stats,
  });
}
