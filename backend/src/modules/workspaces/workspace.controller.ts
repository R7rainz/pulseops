import { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../../lib/jwt";
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
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return response.status(401).send({
        message: "Authorization token missing",
      });
    }
    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);

    const body = createWorkspaceSchema.parse(request.body);
    const workspace = await createWorkspaceService(payload.userId, body);

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
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return response.status(401).send({
        message: "Authorization token missing",
      });
    }
    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);

    const workspaces = await getUserWorkspacesService(payload.userId);

    return response.status(201).send({
      message: "Workspaces fetched successfully",
      data: workspaces,
    });
  } catch (error) {
    return response.status(401).send({
      message:
        error instanceof Error ? error.message : "Failed to fetch workspaces",
    });
  }
}
