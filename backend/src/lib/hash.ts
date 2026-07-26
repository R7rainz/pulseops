import crypto from "node:crypto";

// sha256 hex digest, used to store bearer-style secrets (refresh tokens, magic
// links, API keys) so a database or backup leak doesn't hand over live
// credentials. These are high-entropy random tokens, not passwords — a fast
// hash is correct here; bcrypt/argon2 would only add cost without adding
// meaningful resistance to a 256-bit random preimage.
export function sha256Hex(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
