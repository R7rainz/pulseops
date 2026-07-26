import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { sha256Hex } from "./hash";

export type AccessTokenPayload = {
  userId: number;
};

// Short-lived challenge token issued after a first factor (password / magic
// link / OAuth) when the account has 2FA enabled. It only proves "this user
// passed the first factor" — it is NOT a session token and cannot access the
// API. Exchanged for a real session at POST /auth/2fa/verify.
export type MfaTokenPayload = {
  userId: number;
  purpose: "mfa";
};

// This value shipped as a working default in docker-compose.yml, so it is
// public: anyone who has read the repo can forge session tokens signed with it.
// Refuse to start rather than run with it.
const LEAKED_DEFAULT_SECRET_SHA256 =
  "4f091a5e1ebf6afafdeb4f066642dff7b5cf79fffdb41e5f4bf357619bc55e63";

function resolveSecret(): string {
  const raw = process.env.JWT_SECRET?.trim();

  if (raw && sha256Hex(raw) === LEAKED_DEFAULT_SECRET_SHA256) {
    throw new Error(
      "JWT_SECRET is set to the old public default from docker-compose.yml. " +
        "That value is committed to the repository and anyone can forge tokens " +
        "with it. Generate a new one:  openssl rand -hex 32",
    );
  }

  if (raw) {
    if (raw.length < 32) {
      throw new Error(
        "JWT_SECRET is too short — use at least 32 characters (openssl rand -hex 32).",
      );
    }
    return raw;
  }

  // Unset. Rather than shipping a predictable fallback, mint a random one for
  // this process so `docker compose up` still works with zero configuration.
  // Sessions won't survive a restart, and the warning says so — a visible,
  // self-correcting annoyance is much better than a silently forgeable key.
  const ephemeral = crypto.randomBytes(32).toString("hex");
  console.warn(
    "\n[SECURITY] JWT_SECRET is not set — generated a random one for this process.\n" +
      "           All sessions will be invalidated when the API restarts.\n" +
      "           Set JWT_SECRET in your .env to persist logins:  openssl rand -hex 32\n",
  );
  return ephemeral;
}

const JWT_SECRET: string = resolveSecret();

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "15m",
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET) as unknown as AccessTokenPayload;
}

export function signMfaToken(userId: number): string {
  const payload: MfaTokenPayload = { userId, purpose: "mfa" };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "5m" });
}

export function verifyMfaToken(token: string): MfaTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as unknown as MfaTokenPayload;
  if (payload.purpose !== "mfa") {
    throw new Error("Invalid MFA token");
  }
  return payload;
}
