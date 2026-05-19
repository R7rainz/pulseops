import { FastifyRequest, FastifyReply } from "fastify";
import { createWorkspaceSchema } from "./workspace.schema";
import {
  createWorkspaceService,
  getUserWorkspacesService,
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
