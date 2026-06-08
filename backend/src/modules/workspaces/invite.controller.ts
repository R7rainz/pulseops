import { FastifyReply, FastifyRequest } from "fastify";
import crypto from "crypto";
import { prisma } from "../../lib/db";

export async function generateInviteController(
  request: FastifyRequest<{
    Params: { workspaceId: string };
    Body: { role: "ADMIN" | "MEMBER" | "VIEWER"; email?: string };
  }>,
  response: FastifyReply,
) {
  try {
    const workspaceId = Number(request.params.workspaceId);
    const { role, email } = request.body;

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId,
        token,
        role: role || "VIEWER",
        email: email || null,
        expiresAt,
      },
    });

    return response.status(201).send({
      message: email
        ? `Secure invite generated for ${email}`
        : "Secure invite token generated",
      data: {
        id: invite.id,
        email: invite.email,
        token: invite.token,
        role: invite.role,
        expiresAt: invite.expiresAt.toISOString(),
        link: `http://localhost:3000/invite/${invite.token}`,
      },
    });
  } catch (error) {
    return response.status(500).send({
      message: "Failed to generate cryptographic token",
    });
  }
}

export async function lookupInviteController(
  request: FastifyRequest<{ Params: { token: string } }>,
  response: FastifyReply,
) {
  try {
    const { token } = request.params;

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!invite) {
      return response.status(404).send({
        message: "Invalid or unrecognised invite signature",
      });
    }

    const expired = new Date() > invite.expiresAt;

    return response.status(200).send({
      message: expired ? "Invite has expired" : "Invite is valid",
      data: {
        workspace: invite.workspace,
        role: invite.role,
        expiresAt: invite.expiresAt.toISOString(),
        expired,
      },
    });
  } catch (error) {
    return response.status(500).send({
      message: "Failed to look up invite",
    });
  }
}

export async function acceptInviteController(
  request: FastifyRequest<{ Params: { token: string } }>,
  response: FastifyReply,
) {
  try {
    const { token } = request.params;
    const userId = request.user.userId;

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return response.status(404).send({
        message: "Invalid or unrecognised invite signature",
      });
    }

    if (new Date() > invite.expiresAt) {
      await prisma.workspaceInvite.delete({ where: { id: invite.id } });
      return response.status(410).send({
        message: "Invite has expired",
      });
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId: invite.workspaceId },
      },
    });

    if (existing) {
      await prisma.workspaceInvite.delete({ where: { id: invite.id } });
      return response.status(200).send({
        message: "You are already a member of this workspace",
        data: { workspaceId: invite.workspaceId },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.workspaceMember.create({
        data: {
          userId,
          workspaceId: invite.workspaceId,
          role: invite.role,
        },
      });
      await tx.workspaceInvite.delete({ where: { id: invite.id } });
    });

    return response.status(200).send({
      message: "Invite accepted",
      data: { workspaceId: invite.workspaceId },
    });
  } catch (error) {
    return response.status(500).send({
      message: "Failed to accept invite",
    });
  }
}

export async function listInvitesController(
  request: FastifyRequest<{ Params: { workspaceId: string } }>,
  response: FastifyReply,
) {
  try {
    const workspaceId = Number(request.params.workspaceId);

    const invites = await prisma.workspaceInvite.findMany({
      where: { workspaceId },
      select: {
        id: true,
        token: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const active = invites.filter((i) => now <= i.expiresAt);
    const expired = invites.filter((i) => now > i.expiresAt);

    return response.status(200).send({
      message: "Workspace invites fetched",
      data: { active, expired },
    });
  } catch (error) {
    return response.status(500).send({
      message: "Failed to list invites",
    });
  }
}

export async function revokeInviteController(
  request: FastifyRequest<{ Params: { workspaceId: string; inviteId: string } }>,
  response: FastifyReply,
) {
  try {
    const inviteId = Number(request.params.inviteId);
    const workspaceId = Number(request.params.workspaceId);

    await prisma.workspaceInvite.delete({
      where: { id: inviteId },
    });

    return response.status(200).send({
      message: "Invite revoked",
    });
  } catch (error) {
    return response.status(500).send({
      message: "Failed to revoke invite",
    });
  }
}
