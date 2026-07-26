import crypto from "node:crypto";
import { prisma } from "./db";
import { sha256Hex } from "./hash";
import { signAccessToken } from "./jwt";

// Revocable refresh-token sessions.
//
// The access token stays a short-lived (15m) stateless JWT. Alongside it we
// issue an opaque refresh token (32 random bytes, hex). We never store the raw
// refresh token — only its sha256 hash in the Session table. On refresh we
// find the matching non-revoked, non-expired session and mint a new access
// token; the refresh token itself is kept (not rotated) so the frontend can
// refresh from Server Components — where Next.js forbids writing cookies — and
// still keep a working refresh token. Logout revokes the row. This replaces
// the old "re-sign any validly-signed JWT forever" behaviour: refresh now
// requires a live DB session, and logout can invalidate it before expiry.

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type SessionMeta = {
  userAgent?: string | null;
  ip?: string | null;
};

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
};

const hashToken = sha256Hex;

function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a brand-new session for a user and return the token pair. The raw
 * refresh token is returned to the caller and never persisted.
 */
export async function issueSession(
  userId: number,
  meta: SessionMeta = {},
): Promise<SessionTokens> {
  const refreshToken = generateRefreshToken();
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: hashToken(refreshToken),
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
      expiresAt: refreshExpiresAt,
    },
  });

  return {
    accessToken: signAccessToken({ userId }),
    refreshToken,
    refreshExpiresAt,
  };
}

/**
 * Validate a refresh token and mint a fresh access token. The refresh token is
 * kept (not rotated) but the session must be live — unknown, revoked, or
 * expired tokens are rejected. Returns the same refresh token so callers that
 * can't persist cookies (Server Components) stay usable.
 */
export async function renewSession(
  refreshToken: string,
): Promise<SessionTokens & { userId: number }> {
  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: hashToken(refreshToken) },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new Error("Invalid or expired refresh token");
  }

  return {
    accessToken: signAccessToken({ userId: session.userId }),
    refreshToken,
    refreshExpiresAt: session.expiresAt,
    userId: session.userId,
  };
}

/**
 * Revoke the session backing a refresh token (logout). Silently no-ops if the
 * token doesn't map to an active session.
 */
export async function revokeSession(refreshToken: string): Promise<void> {
  await prisma.session.updateMany({
    where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revoke every active session for a user (e.g. after disabling 2FA). */
export async function revokeAllUserSessions(userId: number): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
