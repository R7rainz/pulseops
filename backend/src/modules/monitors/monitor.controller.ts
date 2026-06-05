import { FastifyReply } from "fastify";
import { FastifyRequest } from "fastify/types/request";
import { createMonitorSchema, updateMonitorSchema } from "./monitor.schema";
import {
  createMonitorService,
  getMonitorChecksService,
  getMonitorService,
  getMonitorStatsService,
  getWorkspaceMonitorsService,
  pauseMonitorService,
  resumeMonitorService,
  updateMonitorService,
  deleteMonitorService,
  enqueueMonitorCheckService,
} from "./monitor.service";
import { prisma } from "../../lib/db";

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

  try {
    const monitors = await getWorkspaceMonitorsService(
      request.user.userId,
      numWorkspaceID,
    );

    return response.status(200).send({
      message: "Monitors fetched successfully",
      data: monitors,
    });
  } catch (error) {
    // 1. Check if this is our specific security error from the Service layer
    if (
      error instanceof Error &&
      error.message === "You do not have access to this workspace"
    ) {
      return response.status(403).send({
        message: "Forbidden: You do not have access to this workspace",
      });
    }

    // 2. If it's a completely unexpected database crash, return a 500
    console.error("[getWorkspaceMonitorsController] CRITICAL:", error);
    return response.status(500).send({
      message: "Internal Server Error",
    });
  }
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

  const queuedJob = await enqueueMonitorCheckService(
    request.user.userId,
    monitorId,
  );

  return response.status(202).send({
    message: "Monitor check queued successfully",
    data: queuedJob,
  });
}

export async function getMonitorController(
  request: FastifyRequest<{
    Params: { workspaceId: string; monitorId: string };
  }>,
  response: FastifyReply,
) {
  const workspaceId = Number(request.params.workspaceId);
  const monitorId = Number(request.params.monitorId);

  if (Number.isNaN(workspaceId) || Number.isNaN(monitorId)) {
    return response.status(400).send({ message: "Invalid id" });
  }

  try {
    const monitor = await getMonitorService(
      request.user.userId,
      workspaceId,
      monitorId,
    );

    return response.status(200).send({ data: monitor });
  } catch (error) {
    return response.status(404).send({ message: "Monitor not found" });
  }
}

export async function getMonitorChecksController(
  request: FastifyRequest<{
    Params: RunMonitorCheckParams;
    Querystring: { limit?: string; offset?: string };
  }>,
  response: FastifyReply,
) {
  const monitorId = Number(request.params.monitorId);
  if (Number.isNaN(monitorId)) {
    return response.status(400).send({
      message: "Invalid monitor id",
    });
  }
  const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 200);
  const offset = Math.max(Number(request.query.offset) || 0, 0);
  const result = await getMonitorChecksService(
    request.user.userId,
    monitorId,
    limit,
    offset,
  );
  return response.status(200).send({
    message: "Monitor check fetched successfully",
    data: result.checks,
    meta: { total: result.total, limit, offset },
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

export async function pauseMonitorController(
  request: FastifyRequest<{ Params: RunMonitorCheckParams }>,
  response: FastifyReply,
) {
  const monitorId = Number(request.params.monitorId);
  if (Number.isNaN(monitorId)) {
    return response.status(400).send({
      message: "Invalid monitor id",
    });
  }

  const pauseMonitor = await pauseMonitorService(
    request.user.userId,
    monitorId,
  );
  return response.status(200).send({
    message: "Monitor is paused",
    data: pauseMonitor,
  });
}

export async function resumeMonitorController(
  request: FastifyRequest<{ Params: RunMonitorCheckParams }>,
  response: FastifyReply,
) {
  const monitorId = Number(request.params.monitorId);
  if (Number.isNaN(monitorId)) {
    return response.status(400).send({
      message: "Invalid monitor id",
    });
  }

  const resumeMonitor = await resumeMonitorService(
    request.user.userId,
    monitorId,
  );
  return response.status(200).send({
    message: "Monitor is resumed successfully",
    data: resumeMonitor,
  });
}

export async function updateMonitorController(
  request: FastifyRequest<{ Params: RunMonitorCheckParams }>,
  response: FastifyReply,
) {
  const monitorId = Number(request.params.monitorId);

  if (Number.isNaN(monitorId)) {
    return response.status(400).send({
      message: "Invalid monitor id",
    });
  }

  const body = updateMonitorSchema.parse(request.body);

  const updatedMonitor = await updateMonitorService(
    request.user.userId,
    monitorId,
    body,
  );

  return response.status(200).send({
    message: "Monitor updated successfully",
    data: updatedMonitor,
  });
}

export async function deleteMonitorController(
  request: FastifyRequest<{ Params: RunMonitorCheckParams }>,
  response: FastifyReply,
) {
  const monitorId = Number(request.params.monitorId);
  if (Number.isNaN(monitorId)) {
    return response.status(400).send({
      message: "Invalid monitor id",
    });
  }

  const deletedMonitor = await deleteMonitorService(
    request.user.userId,
    monitorId,
  );
  return response.status(200).send({
    message: "Monitor deleted successfully",
    data: deletedMonitor,
  });
}

export async function monitorHeartbeatController(
  request: FastifyRequest<{ Params: RunMonitorCheckParams }>,
  response: FastifyReply,
) {
  try {
    const monitorId = Number(request.params.monitorId);
    const workspaceId = request.machineAuth?.workspaceId;
    if (!workspaceId) {
      return response.status(403).send({
        message: "FORBIDDEN: Machine context missing.",
      });
    }

    const target = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
        workspaceId,
      },
    });

    if (!target) {
      return response.status(404).send({
        message: "Target node not found or access denied",
      });
    }

    if (target.status === "PAUSED") {
      prisma.monitor.update({
        where: {
          id: monitorId,
        },
        data: {
          status: "UP",
          lastCheckedAt: new Date(),
        },
      });

      prisma.monitorCheck.create({
        data: {
          monitorId: monitorId,
          status: "UP",
          statusCode: 200,
          responseTimeMs: 0,
        },
      });
    }

    return response.status(200).send({
      message: `HEARTBEAT ACKNOWLEDGE: Node [${target.name}] status UP`,
    });
  } catch (error) {
    console.error("Heartbeat processing failure: ", error);
    return response.status(500).send({
      message: "Internal telemetry failure.",
    });
  }
}
