import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../lib/db";

export async function listMembersController(
  request: FastifyRequest<{ Params: { workspaceId: string } }>,
  response: FastifyReply,
) {
  try {
    const workspaceId = Number(request.params.workspaceId);

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
      orderBy: [
        { role: "asc" },
        { user: { name: "asc" } },
      ],
    });

    const sorted = members.sort((a, b) => {
      const rank: Record<string, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2, VIEWER: 3 };
      return (rank[a.role] ?? 99) - (rank[b.role] ?? 99) ||
        (a.user.name || a.user.email).localeCompare(b.user.name || b.user.email);
    });

    return response.status(200).send({
      message: "Workspace members fetched",
      data: sorted,
    });
  } catch (error) {
    return response.status(500).send({
      message: "Failed to fetch members",
    });
  }
}

export async function removeMemberController(
  request: FastifyRequest<{
    Params: { workspaceId: string; userId: string };
  }>,
  response: FastifyReply,
) {
  try {
    const workspaceId = Number(request.params.workspaceId);
    const userId = Number(request.params.userId);

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      return response.status(404).send({ message: "Member not found" });
    }

    if (member.role === "OWNER") {
      return response.status(403).send({ message: "Cannot remove the workspace owner" });
    }

    await prisma.workspaceMember.delete({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    return response.status(200).send({ message: "Member removed" });
  } catch (error) {
    return response.status(500).send({ message: "Failed to remove member" });
  }
}

export async function updateMemberRoleController(
  request: FastifyRequest<{
    Params: { workspaceId: string; userId: string };
    Body: { role: "ADMIN" | "MEMBER" | "VIEWER" };
  }>,
  response: FastifyReply,
) {
  try {
    const workspaceId = Number(request.params.workspaceId);
    const userId = Number(request.params.userId);
    const { role } = request.body;

    if (!["ADMIN", "MEMBER", "VIEWER"].includes(role)) {
      return response.status(400).send({ message: "Invalid role" });
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      return response.status(404).send({ message: "Member not found" });
    }

    if (member.role === "OWNER") {
      return response.status(403).send({ message: "Cannot change the owner's role" });
    }

    const updated = await prisma.workspaceMember.update({
      where: { userId_workspaceId: { userId, workspaceId } },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return response.status(200).send({
      message: "Member role updated",
      data: updated,
    });
  } catch (error) {
    return response.status(500).send({ message: "Failed to update member role" });
  }
}
