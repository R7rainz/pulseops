import crypto from "node:crypto";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { prisma } from "../../lib/db";
import { verifyMfaToken } from "../../lib/jwt";
import { issueSession, type SessionMeta } from "../../lib/session";
import type {
  TwoFactorEnableInput,
  TwoFactorVerifyInput,
  TwoFactorDisableInput,
} from "./auth.schema";
import type { SessionResult } from "./auth.service";

const ISSUER = "PulseOps";
const RECOVERY_CODE_COUNT = 10;

function hashCode(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = crypto.randomBytes(5).toString("hex"); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

/**
 * Begin 2FA enrolment: generate a fresh secret and the otpauth URI + QR code
 * the user scans. Nothing is persisted until POST /2fa/enable confirms the user
 * can produce a valid code from the secret.
 */
export async function setupTwoFactorService(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.totpEnabled) throw new Error("Two-factor is already enabled");

  const secret = generateSecret();
  const otpauthUrl = generateURI({ issuer: ISSUER, label: user.email, secret });
  const qrCode = await QRCode.toDataURL(otpauthUrl);

  return { secret, otpauthUrl, qrCode };
}

/**
 * Confirm enrolment: verify a code against the pending secret, then persist the
 * secret, flip totpEnabled, and mint one-time recovery codes (returned once).
 */
export async function enableTwoFactorService(
  userId: number,
  input: TwoFactorEnableInput,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.totpEnabled) throw new Error("Two-factor is already enabled");

  const valid =
    /^\d{6}$/.test(input.code.trim()) &&
    (await verify({ secret: input.secret, token: input.code.trim(), epochTolerance: 30 })).valid;
  if (!valid) throw new Error("Invalid verification code");

  const recoveryCodes = generateRecoveryCodes();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { totpSecret: input.secret, totpEnabled: true },
    }),
    prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
    prisma.mfaRecoveryCode.createMany({
      data: recoveryCodes.map((code) => ({ userId, codeHash: hashCode(code) })),
    }),
  ]);

  return { recoveryCodes };
}

/**
 * Disable 2FA. Requires a valid current TOTP or recovery code so a hijacked
 * session can't silently strip the second factor.
 */
export async function disableTwoFactorService(
  userId: number,
  input: TwoFactorDisableInput,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (!user.totpEnabled || !user.totpSecret) {
    throw new Error("Two-factor is not enabled");
  }

  const ok = await verifyTotpOrRecovery(userId, user.totpSecret, input.code);
  if (!ok) throw new Error("Invalid verification code");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { totpSecret: null, totpEnabled: false },
    }),
    prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
  ]);
}

/**
 * Complete the second factor during login: validate the short-lived MFA
 * challenge token, check the TOTP/recovery code, then issue a real session.
 */
export async function verifyTwoFactorService(
  input: TwoFactorVerifyInput,
  meta: SessionMeta = {},
): Promise<SessionResult> {
  const { userId } = verifyMfaToken(input.mfaToken);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.totpEnabled || !user.totpSecret) {
    throw new Error("Two-factor is not enabled");
  }

  const ok = await verifyTotpOrRecovery(userId, user.totpSecret, input.code);
  if (!ok) throw new Error("Invalid verification code");

  const tokens = await issueSession(userId, meta);
  return {
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    ...tokens,
  };
}

/**
 * Accept either a valid TOTP code or an unused recovery code. A consumed
 * recovery code is marked used so it can't be replayed.
 */
async function verifyTotpOrRecovery(
  userId: number,
  secret: string,
  code: string,
): Promise<boolean> {
  const normalized = code.trim();

  // A 6-digit numeric code is a TOTP; anything else is treated as a recovery
  // code (otplib.verify throws on non-6-digit input, so we gate it).
  if (/^\d{6}$/.test(normalized)) {
    const { valid } = await verify({ secret, token: normalized, epochTolerance: 30 });
    if (valid) {
      return true;
    }
  }

  const recovery = await prisma.mfaRecoveryCode.findFirst({
    where: { userId, codeHash: hashCode(normalized.toLowerCase()), usedAt: null },
  });
  if (recovery) {
    await prisma.mfaRecoveryCode.update({
      where: { id: recovery.id },
      data: { usedAt: new Date() },
    });
    return true;
  }

  return false;
}
