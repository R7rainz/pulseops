import crypto from "node:crypto";
import { prisma } from "../../lib/db";
import { checkPassword, hashPassword } from "../../lib/password";
import { LoginInput, SignupInput, UpdateMeInput, ForgotPasswordInput, ResetPasswordInput, DeleteAccountInput } from "./auth.schema";
import { sendResetPasswordEmail } from "../../lib/email";
import { signMfaToken } from "../../lib/jwt";
import {
  issueSession,
  renewSession,
  revokeSession,
  type SessionMeta,
} from "../../lib/session";

type PublicUser = {
  id: number;
  name: string | null;
  email: string;
  createdAt: Date;
};

export type SessionResult = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
};

export type MfaChallengeResult = {
  mfaRequired: true;
  mfaToken: string;
};

export type LoginResult = SessionResult | MfaChallengeResult;

/**
 * Finalize an authenticated first factor. If the user has 2FA enabled we stop
 * here and return a short-lived MFA challenge instead of a session — the caller
 * must complete POST /auth/2fa/verify. Otherwise we mint a full session.
 *
 * Shared by password login, magic-link verify, and OAuth exchange so every
 * sign-in path enforces 2FA consistently.
 */
export async function completeAuthentication(
  user: { id: number; name: string | null; email: string; createdAt: Date; totpEnabled: boolean },
  meta: SessionMeta = {},
): Promise<LoginResult> {
  if (user.totpEnabled) {
    return { mfaRequired: true, mfaToken: signMfaToken(user.id) };
  }

  const tokens = await issueSession(user.id, meta);
  return {
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    ...tokens,
  };
}

export async function signupService(input: SignupInput, meta: SessionMeta = {}): Promise<SessionResult> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  const tokens = await issueSession(user.id, meta);
  return { user, ...tokens };
}

export async function loginService(input: LoginInput, meta: SessionMeta = {}): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });
  // Reject if there's no user, or the account has no password (OAuth-only /
  // passwordless account — must sign in with its provider or a magic link).
  if (!user || !user.passwordHash) {
    throw new Error("Invalid email or password");
  }

  const valid = await checkPassword(input.password, user.passwordHash);
  if (!valid) throw new Error("Invalid email or password");

  return completeAuthentication(user, meta);
}

export async function refreshTokenService(refreshToken: string) {
  const { accessToken, refreshToken: sameRefreshToken, refreshExpiresAt } =
    await renewSession(refreshToken);
  return { accessToken, refreshToken: sameRefreshToken, refreshExpiresAt };
}

export async function logoutService(refreshToken: string) {
  await revokeSession(refreshToken);
}

/**
 * Permanently delete a user's account. For password accounts the password must
 * be re-confirmed. Workspaces the user OWNS are deleted (cascading their
 * monitors, members, webhooks, API keys and invites); the user's memberships in
 * other people's workspaces are removed; then the user row is deleted (its
 * sessions, OAuth links and recovery codes cascade away).
 */
export async function deleteAccountService(userId: number, input: DeleteAccountInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  if (user.passwordHash) {
    if (!input.password) {
      throw new Error("Password is required to delete your account");
    }
    const valid = await checkPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new Error("Password is incorrect");
    }
  }

  const ownerMemberships = await prisma.workspaceMember.findMany({
    where: { userId, role: "OWNER" },
    select: { workspaceId: true },
  });
  const ownedWorkspaceIds = ownerMemberships.map((m) => m.workspaceId);

  await prisma.$transaction([
    // Owned workspaces (cascades members, monitors, webhooks, API keys, invites)
    prisma.workspace.deleteMany({ where: { id: { in: ownedWorkspaceIds } } }),
    // Remaining memberships in workspaces owned by others
    prisma.workspaceMember.deleteMany({ where: { userId } }),
    // The user itself (sessions, OAuth accounts, recovery codes cascade)
    prisma.user.delete({ where: { id: userId } }),
  ]);
}

export async function getMeService(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      emailVerified: true,
      totpEnabled: true,
      passwordHash: true,
    },
  });
  if (!user) {
    throw new Error("User not found");
  }

  // Expose whether a password is set (so the UI can require it for sensitive
  // actions) without ever leaking the hash itself.
  const { passwordHash, ...safe } = user;
  return { ...safe, hasPassword: !!passwordHash };
}

export async function updateMeService(userId: number, input: UpdateMeInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new Error("User not found");
  }

  if (input.newPassword) {
    // A passwordless (OAuth/magic-link) account has no current password to
    // verify — it can set one without the currentPassword check.
    if (user.passwordHash) {
      if (!input.currentPassword) {
        throw new Error("Current password is required to set a new password");
      }
      const valid = await checkPassword(input.currentPassword, user.passwordHash);
      if (!valid) {
        throw new Error("Current password is incorrect");
      }
    }
  }

  const data: { name?: string; email?: string; passwordHash?: string } = {};
  if (input.name) data.name = input.name;
  if (input.email) data.email = input.email;
  if (input.newPassword) data.passwordHash = await hashPassword(input.newPassword);

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return updated;
}

export async function forgotPasswordService(input: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    // Don't reveal whether the email exists
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expires,
    },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const resetLink = `${appUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(input.email)}`;

  await sendResetPasswordEmail({ to: input.email, resetLink });
}

export async function resetPasswordService(input: ResetPasswordInput) {
  const hashedToken = crypto.createHash("sha256").update(input.token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new Error("Invalid or expired reset token.");
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });
}
