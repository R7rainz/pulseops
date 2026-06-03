import jwt from "jsonwebtoken";

export type AccessTokenPayload = {
  userId: number;
};

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing");
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "15m",
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
}

export function verifyAccessTokenIgnoringExpiry(
  token: string,
): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET, {
    ignoreExpiration: true,
  }) as AccessTokenPayload;
}
