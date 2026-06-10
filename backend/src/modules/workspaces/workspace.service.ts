import { CreateWorkspaceInput, UpdateWorkspaceInput } from "./workspace.schema";
import { prisma } from "../../lib/db";

function createSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createWorkspaceService(
  userId: number,
  input: CreateWorkspaceInput,
) {
  const slug = createSlug(input.name);
  const workspace = await prisma.$transaction(async (tx) => {
    const createdWorkspace = await tx.workspace.create({
      data: {
        name: input.name,
        slug,
      },
    });
    await tx.workspaceMember.create({
      data: {
        userId,
        workspaceId: createdWorkspace.id,
        role: "OWNER",
      },
    });
    return createdWorkspace;
  });

  return workspace;
}

export async function getUserWorkspacesService(userId: number) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
          planTier: true,
        },
      },
    },
  });

  return memberships.map((membership) => ({
    ...membership.workspace,
    role: membership.role,
  }));
}

export async function getWorkspaceService(
  userId: number,
  workspaceId: number,
) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
          planTier: true,
        },
      },
    },
  });

  if (!membership) throw new Error("Workspace not found");

  return { ...membership.workspace, role: membership.role };
}

export async function updateWorkspaceService(
  userId: number,
  workspaceId: number,
  input: UpdateWorkspaceInput,
) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId, role: "OWNER" },
  });

  if (!membership) throw new Error("Only workspace owners can update settings");

  const data: Record<string, string> = {};
  if (input.name) {
    data.name = input.name;
    data.slug = createSlug(input.name);
  }

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data,
  });

  return workspace;
}

export async function deleteWorkspaceService(
  userId: number,
  workspaceId: number,
) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId, role: "OWNER" },
  });

  if (!membership) throw new Error("Only workspace owners can delete workspaces");

  await prisma.workspace.delete({
    where: { id: workspaceId },
  });
}
