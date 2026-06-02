import type { FastifyRequest, FastifyReply } from "fastify";
import { createWorkspaceSchema, updateWorkspaceSchema } from "./workspace.schema";
import {
  createWorkspaceService,
  getUserWorkspacesService,
  getWorkspaceService,
  updateWorkspaceService,
  deleteWorkspaceService,
} from "./workspace.service";

export async function createWorkspaceController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const body = createWorkspaceSchema.parse(request.body);
    const workspace = await createWorkspaceService(request.user.userId, body);

    return response.status(201).send({
      message: "Workspace created successfully",
      data: workspace,
    });
  } catch (error) {
    return response.status(400).send({
      message:
        error instanceof Error ? error.message : "Workspace creation failed",
    });
  }
}

export async function getWorkspacesController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const workspaces = await getUserWorkspacesService(request.user.userId);

    return response.status(200).send({
      message: "Workspaces fetched successfully",
      data: workspaces,
    });
  } catch (error) {
    return response.status(400).send({
      message:
        error instanceof Error ? error.message : "Failed to fetch workspaces",
    });
  }
}

export async function getWorkspaceController(
  request: FastifyRequest<{ Params: { workspaceId: string } }>,
  response: FastifyReply,
) {
  try {
    const workspaceId = Number(request.params.workspaceId);
    const workspace = await getWorkspaceService(
      request.user.userId,
      workspaceId,
    );

    return response.status(200).send({
      message: "Workspace fetched successfully",
      data: workspace,
    });
  } catch (error) {
    return response.status(400).send({
      message:
        error instanceof Error ? error.message : "Failed to fetch workspace",
    });
  }
}

export async function updateWorkspaceController(
  request: FastifyRequest<{ Params: { workspaceId: string } }>,
  response: FastifyReply,
) {
  try {
    const workspaceId = Number(request.params.workspaceId);
    const body = updateWorkspaceSchema.parse(request.body);
    const workspace = await updateWorkspaceService(
      request.user.userId,
      workspaceId,
      body,
    );

    return response.status(200).send({
      message: "Workspace updated successfully",
      data: workspace,
    });
  } catch (error) {
    return response.status(400).send({
      message:
        error instanceof Error ? error.message : "Failed to update workspace",
    });
  }
}

export async function deleteWorkspaceController(
  request: FastifyRequest<{ Params: { workspaceId: string } }>,
  response: FastifyReply,
) {
  try {
    const workspaceId = Number(request.params.workspaceId);
    await deleteWorkspaceService(request.user.userId, workspaceId);

    return response.status(200).send({
      message: "Workspace deleted successfully",
    });
  } catch (error) {
    return response.status(400).send({
      message:
        error instanceof Error ? error.message : "Failed to delete workspace",
    });
  }
}
