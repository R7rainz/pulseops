import crypto from "node:crypto";
import { redis } from "../../lib/redis";
import { prisma } from "../../lib/db";
import { issueSession, type SessionMeta } from "../../lib/session";

/**
 * OAuth-style device authorization flow (RFC 8628-ish), used by the CLI/TUI so
 * a terminal app can authenticate through the browser — covering password,
 * OAuth and 2FA users uniformly, since the actual sign-in happens in the web
 * app. Handoff state lives in Redis with a short TTL.
 *
 *   1. CLI  → POST /auth/device/authorize   → { deviceCode, userCode, url }
 *   2. user → opens url, signs in, approves  → POST /auth/device/approve
 *   3. CLI  → polls POST /auth/device/token  → { accessToken, refreshToken }
 *
 * Tokens are minted only at step 3 (on retrieval), never stored in Redis —
 * approval just records the userId against the device code.
 */

const TTL_SECONDS = 600; // codes live 10 minutes
const POLL_INTERVAL = 5; // seconds the client should wait between polls

interface DeviceRecord {
  userCode: string;
  status: "pending" | "approved";
  userId?: number;
}

const codeKey = (deviceCode: string) => `device:code:${deviceCode}`;
const userKey = (userCode: string) => `device:user:${userCode}`;

// Human-typable, unambiguous alphabet (no 0/O/1/I), formatted XXXX-XXXX.
function generateUserCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = () =>
    Array.from({ length: 4 }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");
  return `${block()}-${block()}`;
}

export function normalizeUserCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export async function createDeviceAuthorization(appUrl: string) {
  const deviceCode = crypto.randomBytes(32).toString("hex");
  const userCode = generateUserCode();
  const record: DeviceRecord = { userCode, status: "pending" };

  await redis.set(codeKey(deviceCode), JSON.stringify(record), "EX", TTL_SECONDS);
  await redis.set(userKey(userCode), deviceCode, "EX", TTL_SECONDS);

  const base = appUrl.replace(/\/+$/, "");
  return {
    deviceCode,
    userCode,
    verificationUri: `${base}/device`,
    verificationUriComplete: `${base}/device?code=${encodeURIComponent(userCode)}`,
    expiresIn: TTL_SECONDS,
    interval: POLL_INTERVAL,
  };
}

export type PollResult =
  | { status: "pending" }
  | { status: "expired" }
  | {
      status: "authorized";
      accessToken: string;
      refreshToken: string;
      user: { id: number; name: string | null; email: string; createdAt: Date } | null;
    };

/** CLI polls this. Mints the session on approval, then consumes the code. */
export async function pollDeviceToken(
  deviceCode: string,
  meta: SessionMeta,
): Promise<PollResult> {
  const raw = await redis.get(codeKey(deviceCode));
  if (!raw) return { status: "expired" };

  const record: DeviceRecord = JSON.parse(raw);
  if (record.status !== "approved" || record.userId == null) {
    return { status: "pending" };
  }

  // Consume the code so tokens are issued exactly once.
  await redis.del(codeKey(deviceCode));
  await redis.del(userKey(record.userCode));

  const tokens = await issueSession(record.userId, {
    ...meta,
    userAgent: meta.userAgent ?? "pulseops-cli",
  });
  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return {
    status: "authorized",
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user,
  };
}

/** The signed-in web user approves a device code. Records the userId only. */
export async function approveDevice(userCodeRaw: string, userId: number): Promise<void> {
  const userCode = normalizeUserCode(userCodeRaw);
  const deviceCode = await redis.get(userKey(userCode));
  if (!deviceCode) throw new Error("Invalid or expired code");

  const raw = await redis.get(codeKey(deviceCode));
  if (!raw) throw new Error("Invalid or expired code");

  const record: DeviceRecord = JSON.parse(raw);
  if (record.status === "approved") throw new Error("This code has already been used");

  const ttl = await redis.ttl(codeKey(deviceCode));
  const updated: DeviceRecord = { ...record, status: "approved", userId };
  await redis.set(
    codeKey(deviceCode),
    JSON.stringify(updated),
    "EX",
    ttl > 0 ? ttl : TTL_SECONDS,
  );
}
