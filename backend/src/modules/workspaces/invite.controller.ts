import { FastifyReply, FastifyRequest } from "fastify";
import crypto from "crypto";
import { prisma } from "../../lib/db";
import { sendInviteEmail } from "../../lib/email";

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export async function generateInviteController(
  request: FastifyRequest<{
    Params: { workspaceId: string };
    Body: { role?: "ADMIN" | "MEMBER" | "VIEWER"; emails?: string; email?: string };
  }>,
  response: FastifyReply,
) {
  try {
    const workspaceId = Number(request.params.workspaceId);
    const role = request.body.role || "VIEWER";

    // Accept both `emails` (bulk) and `email` (single) for backwards compat
    const rawEmails = request.body.emails || request.body.email || "";
    const parsed = parseEmails(rawEmails);

    if (parsed.length === 0) {
      return response.status(400).send({
        message: "At least one email address is required",
      });
    }

    const invalid = parsed.filter((e) => !validateEmail(e));
    if (invalid.length > 0) {
      return response.status(400).send({
        message: `Invalid email addresses: ${invalid.join(", ")}`,
        data: { invalid },
      });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });

    if (!workspace) {
      return response.status(404).send({ message: "Workspace not found" });
    }

    const inviter = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { name: true },
    });

    const invitedByName = inviter?.name || "A workspace admin";

    const results: Array<{
      email: string;
      token: string;
      link: string;
      role: string;
      sent: boolean;
      error?: string;
    }> = [];

    for (const email of parsed) {
      try {
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const invite = await prisma.workspaceInvite.create({
          data: { workspaceId, token, role, email, expiresAt },
        });

        const baseUrl = process.env.APP_URL || "http://localhost:3000";
        const link = `${baseUrl}/invite/${invite.token}`;

        try {
          await sendInviteEmail({
            to: email,
            workspaceName: workspace.name,
            inviteLink: link,
            role: invite.role,
            invitedByName,
          });
          results.push({ email, token: invite.token, link, role: invite.role, sent: true });
        } catch (mailErr) {
          const errMsg = mailErr instanceof Error ? mailErr.message : String(mailErr);
          console.error(`[INVITE] Email failed for ${email}:`, errMsg);
          results.push({
            email,
            token: invite.token,
            link,
            role: invite.role,
            sent: false,
            error: errMsg,
          });
        }
      } catch (err) {
        results.push({
          email,
          token: "",
          link: "",
          role,
          sent: false,
          error: "Failed to create invite",
        });
      }
    }

    const succeeded = results.filter((r) => r.sent);
    const failed = results.filter((r) => !r.sent);

    return response.status(failed.length === 0 ? 201 : 207).send({
      message: `Generated ${succeeded.length} invite(s), ${failed.length} failed`,
      data: { results, succeeded: succeeded.length, failed: failed.length },
    });
  } catch (error) {
    return response.status(500).send({
      message: "Failed to generate invites",
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
