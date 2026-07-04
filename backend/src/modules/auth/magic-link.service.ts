import crypto from "node:crypto";
import { prisma } from "../../lib/db";
import { sendMagicLinkEmail } from "../../lib/email";
import { completeAuthentication, type LoginResult } from "./auth.service";
import type { SessionMeta } from "../../lib/session";
import type { MagicLinkRequestInput, MagicLinkVerifyInput } from "./auth.schema";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Issue a passwordless sign-in link. Mirrors the password-reset flow: only the
 * sha256 hash of the token is stored, and we silently no-op for unknown emails
 * so the endpoint can't be used to enumerate accounts.
 */
export async function requestMagicLinkService(input: MagicLinkRequestInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    // Don't reveal whether the email exists.
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.magicLinkToken.create({
    data: {
      email: user.email,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
    },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const magicLink = `${appUrl}/magic?token=${rawToken}`;
  await sendMagicLinkEmail({ to: user.email, magicLink });
}

/**
 * Consume a magic-link token and sign the user in. Single-use: the token is
 * marked used on success. Proving email ownership also verifies the email.
 * If the account has 2FA enabled, returns an MFA challenge instead.
 */
export async function verifyMagicLinkService(
  input: MagicLinkVerifyInput,
  meta: SessionMeta = {},
): Promise<LoginResult> {
  const record = await prisma.magicLinkToken.findUnique({
    where: { tokenHash: hashToken(input.token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new Error("Invalid or expired sign-in link");
  }

  const user = await prisma.user.findUnique({ where: { email: record.email } });
  if (!user) {
    throw new Error("Invalid or expired sign-in link");
  }

  await prisma.$transaction([
    prisma.magicLinkToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    ...(user.emailVerified
      ? []
      : [
          prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
          }),
        ]),
  ]);

  return completeAuthentication(user, meta);
}
