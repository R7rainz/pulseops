import { CreateWorkspaceInput } from "./workspace.schema";
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
    where: {
      userId,
    },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return memberships.map((membership) => ({
    ...membership.workspace,
    role: membership.role,
  }));
}
