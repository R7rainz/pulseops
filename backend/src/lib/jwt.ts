import jwt from "jsonwebtoken";

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

const rawSecret = process.env.JWT_SECRET;
if (!rawSecret) throw new Error("JWT_SECRET is missing");
const JWT_SECRET: string = rawSecret;

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
