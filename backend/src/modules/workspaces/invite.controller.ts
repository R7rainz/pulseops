import { FastifyReply, FastifyRequest } from "fastify";
import crypto from "crypto";
import { prisma } from "../../lib/db";
import { sendInviteEmail } from "../../lib/email";
import type { WorkspaceInvite, WorkspaceRole } from "../../generated/prisma/client";

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

const ASSIGNABLE_ROLES = ["ADMIN", "MEMBER", "VIEWER"] as const;

function normalizeRole(role: unknown): WorkspaceRole {
  return ASSIGNABLE_ROLES.includes(role as any) ? (role as WorkspaceRole) : "VIEWER";
}

/**
 * Resolve a requested lifetime (in hours) to an absolute expiry.
 * - `null` (explicit) → never expires.
 * - `undefined` → default 7 days.
 * - a positive number → now + that many hours.
 * - anything else (0, negative, NaN) → never expires.
 */
function computeExpiry(expiresInHours: number | null | undefined): Date | null {
  if (expiresInHours === null) return null;
  if (expiresInHours === undefined) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const n = Number(expiresInHours);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(Date.now() + n * 60 * 60 * 1000);
}

function isExpired(invite: Pick<WorkspaceInvite, "expiresAt">): boolean {
  return invite.expiresAt !== null && new Date() > invite.expiresAt;
}

function usesExhausted(invite: Pick<WorkspaceInvite, "maxUses" | "useCount">): boolean {
  return invite.maxUses !== null && invite.useCount >= invite.maxUses;
}

function inviteLinkFor(token: string): string {
  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  return `${baseUrl}/invite/${token}`;
}

/**
 * Create invites. Two modes, chosen by the request body:
 *  - Email mode  (`emails`/`email` present): one targeted single-use invite per
 *    address, emailed out. Skips addresses that already belong to a member and
 *    refreshes an existing pending invite instead of stacking duplicates.
 *  - Link mode   (no emails): one shareable, multi-use invite (Discord-style)
 *    with an optional max-uses cap and custom expiry. Returns the link.
 */
export async function generateInviteController(
  request: FastifyRequest<{
    Params: { workspaceId: string };
    Body: {
      role?: string;
      emails?: string;
      email?: string;
      expiresInHours?: number | null;
      maxUses?: number | null;
    };
  }>,
  response: FastifyReply,
) {
  try {
    const workspaceId = Number(request.params.workspaceId);
    const role = normalizeRole(request.body.role);
    const expiresAt = computeExpiry(request.body.expiresInHours);

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

    const rawEmails = request.body.emails || request.body.email || "";
    const parsed = parseEmails(rawEmails);

    // ---- Link mode: no recipients → one shareable multi-use invite ----------
    if (parsed.length === 0) {
      const rawMax = request.body.maxUses;
      const maxUses =
        rawMax === null || rawMax === undefined ? null : Math.max(1, Math.floor(Number(rawMax)));

      const token = crypto.randomBytes(32).toString("hex");
      const invite = await prisma.workspaceInvite.create({
        data: { workspaceId, token, role, email: null, expiresAt, maxUses, invitedByName },
      });

      return response.status(201).send({
        message: "Invite link created",
        data: {
          mode: "link",
          invite: serializeInvite(invite),
          link: inviteLinkFor(invite.token),
        },
      });
    }

    // ---- Email mode: targeted single-use invites ----------------------------
    const invalid = parsed.filter((e) => !validateEmail(e));
    if (invalid.length > 0) {
      return response.status(400).send({
        message: `Invalid email addresses: ${invalid.join(", ")}`,
        data: { invalid },
      });
    }

    // Emails already belonging to a member are skipped up front.
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { user: { select: { email: true } } },
    });
    const memberEmails = new Set(members.map((m) => m.user.email.toLowerCase()));

    // De-dupe within the request itself too.
    const seen = new Set<string>();

    const results: Array<{
      email: string;
      token: string;
      link: string;
      role: string;
      status: "sent" | "updated" | "already_member" | "failed";
      error?: string;
    }> = [];

    for (const email of parsed) {
      const key = email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      if (memberEmails.has(key)) {
        results.push({ email, token: "", link: "", role, status: "already_member" });
        continue;
      }

      try {
        // Refresh an existing pending invite for this address rather than stack.
        const existing = await prisma.workspaceInvite.findFirst({
          where: { workspaceId, email },
        });

        const invite = existing
          ? await prisma.workspaceInvite.update({
              where: { id: existing.id },
              data: { role, expiresAt, invitedByName, maxUses: null, useCount: 0 },
            })
          : await prisma.workspaceInvite.create({
              data: {
                workspaceId,
                token: crypto.randomBytes(32).toString("hex"),
                role,
                email,
                expiresAt,
                invitedByName,
              },
            });

        const link = inviteLinkFor(invite.token);
        try {
          await sendInviteEmail({
            to: email,
            workspaceName: workspace.name,
            inviteLink: link,
            role: invite.role,
            invitedByName,
            expiresAt,
          });
          results.push({
            email,
            token: invite.token,
            link,
            role: invite.role,
            status: existing ? "updated" : "sent",
          });
        } catch (mailErr) {
          const errMsg = mailErr instanceof Error ? mailErr.message : String(mailErr);
          console.error(`[INVITE] Email failed for ${email}:`, errMsg);
          // The invite still exists and the link works — surface it anyway.
          results.push({ email, token: invite.token, link, role: invite.role, status: "failed", error: errMsg });
        }
      } catch (err) {
        results.push({ email, token: "", link: "", role, status: "failed", error: "Failed to create invite" });
      }
    }

    const succeeded = results.filter((r) => r.status === "sent" || r.status === "updated").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return response.status(failed === 0 ? 201 : 207).send({
      message: `Processed ${results.length} recipient(s): ${succeeded} invited, ${failed} failed`,
      data: { mode: "email", results, succeeded, failed },
    });
  } catch (error) {
    return response.status(500).send({ message: "Failed to generate invites" });
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
      include: { workspace: { select: { id: true, name: true, slug: true } } },
    });

    if (!invite) {
      return response.status(404).send({ message: "Invalid or unrecognised invite signature" });
    }

    const expired = isExpired(invite);
    const exhausted = usesExhausted(invite);

    return response.status(200).send({
      message: expired ? "Invite has expired" : "Invite is valid",
      data: {
        workspace: invite.workspace,
        role: invite.role,
        expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
        expired,
        exhausted,
        isLink: invite.email === null,
        invitedByName: invite.invitedByName,
        maxUses: invite.maxUses,
        useCount: invite.useCount,
        remainingUses: invite.maxUses === null ? null : Math.max(0, invite.maxUses - invite.useCount),
      },
    });
  } catch (error) {
    return response.status(500).send({ message: "Failed to look up invite" });
  }
}

export async function acceptInviteController(
  request: FastifyRequest<{ Params: { token: string } }>,
  response: FastifyReply,
) {
  try {
    const { token } = request.params;
    const userId = request.user.userId;

    const invite = await prisma.workspaceInvite.findUnique({ where: { token } });
    if (!invite) {
      return response.status(404).send({ message: "Invalid or unrecognised invite signature" });
    }

    const isLink = invite.email === null;

    if (isExpired(invite)) {
      // Clean up dead single-use invites; keep links around for admin visibility.
      if (!isLink) await prisma.workspaceInvite.delete({ where: { id: invite.id } });
      return response.status(410).send({ message: "Invite has expired" });
    }

    if (usesExhausted(invite)) {
      return response.status(410).send({ message: "This invite link has reached its maximum uses" });
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: invite.workspaceId } },
    });

    if (existing) {
      // Consume a single-use invite; leave links alone.
      if (!isLink) await prisma.workspaceInvite.delete({ where: { id: invite.id } });
      return response.status(200).send({
        message: "You are already a member of this workspace",
        data: { workspaceId: invite.workspaceId },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.workspaceMember.create({
        data: { userId, workspaceId: invite.workspaceId, role: invite.role },
      });
      if (isLink) {
        await tx.workspaceInvite.update({
          where: { id: invite.id },
          data: { useCount: { increment: 1 } },
        });
      } else {
        await tx.workspaceInvite.delete({ where: { id: invite.id } });
      }
    });

    return response.status(200).send({
      message: "Invite accepted",
      data: { workspaceId: invite.workspaceId },
    });
  } catch (error) {
    return response.status(500).send({ message: "Failed to accept invite" });
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
      orderBy: { createdAt: "desc" },
    });

    const active = invites.filter((i) => !isExpired(i) && !usesExhausted(i)).map(serializeInvite);
    const expired = invites.filter((i) => isExpired(i) || usesExhausted(i)).map(serializeInvite);

    return response.status(200).send({
      message: "Workspace invites fetched",
      data: { active, expired },
    });
  } catch (error) {
    return response.status(500).send({ message: "Failed to list invites" });
  }
}

export async function resendInviteController(
  request: FastifyRequest<{ Params: { workspaceId: string; inviteId: string } }>,
  response: FastifyReply,
) {
  try {
    const workspaceId = Number(request.params.workspaceId);
    const inviteId = Number(request.params.inviteId);

    const invite = await prisma.workspaceInvite.findUnique({
      where: { id: inviteId },
      include: { workspace: { select: { name: true } } },
    });

    if (!invite || invite.workspaceId !== workspaceId) {
      return response.status(404).send({ message: "Invite not found" });
    }
    if (!invite.email) {
      return response.status(400).send({ message: "Shareable links can't be emailed — copy the link instead" });
    }
    if (isExpired(invite)) {
      return response.status(410).send({ message: "Invite has expired" });
    }

    await sendInviteEmail({
      to: invite.email,
      workspaceName: invite.workspace.name,
      inviteLink: inviteLinkFor(invite.token),
      role: invite.role,
      invitedByName: invite.invitedByName || "A workspace admin",
      expiresAt: invite.expiresAt,
    });

    return response.status(200).send({ message: "Invite re-sent" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to resend invite";
    return response.status(500).send({ message: msg });
  }
}

export async function revokeInviteController(
  request: FastifyRequest<{ Params: { workspaceId: string; inviteId: string } }>,
  response: FastifyReply,
) {
  try {
    const inviteId = Number(request.params.inviteId);
    await prisma.workspaceInvite.delete({ where: { id: inviteId } });
    return response.status(200).send({ message: "Invite revoked" });
  } catch (error) {
    return response.status(500).send({ message: "Failed to revoke invite" });
  }
}

function serializeInvite(invite: WorkspaceInvite) {
  return {
    id: invite.id,
    token: invite.token,
    email: invite.email,
    role: invite.role,
    isLink: invite.email === null,
    expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
    maxUses: invite.maxUses,
    useCount: invite.useCount,
    remainingUses: invite.maxUses === null ? null : Math.max(0, invite.maxUses - invite.useCount),
    invitedByName: invite.invitedByName,
    createdAt: invite.createdAt.toISOString(),
  };
}
