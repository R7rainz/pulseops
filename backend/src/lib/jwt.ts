import jwt from "jsonwebtoken";

export type AccessTokenPayload = {
  userId: number;
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

export function verifyAccessTokenIgnoringExpiry(
  token: string,
): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET, {
    ignoreExpiration: true,
  }) as unknown as AccessTokenPayload;
}
