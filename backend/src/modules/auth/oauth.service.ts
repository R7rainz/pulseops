import { prisma } from "../../lib/db";
import {
  PROVIDER_ENUM,
  type ProviderKey,
  type NormalizedOAuthUser,
} from "../../lib/oauth";

type AuthUser = {
  id: number;
  name: string | null;
  email: string;
  createdAt: Date;
  totpEnabled: boolean;
};

/**
 * Map an OAuth identity to a PulseOps user, creating or linking as needed:
 *   1. Known (provider, providerAccountId) → that user.
 *   2. Matching email → link a new OAuthAccount to the existing user.
 *   3. Otherwise → create a passwordless user (emailVerified, no passwordHash).
 *
 * Requires an email from the provider — accounts without one are rejected so we
 * never create a user that can't be found/linked later.
 */
export async function resolveOAuthUser(
  providerKey: ProviderKey,
  normalized: NormalizedOAuthUser,
): Promise<AuthUser> {
  const provider = PROVIDER_ENUM[providerKey];

  const existing = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: normalized.providerAccountId,
      },
    },
    include: { user: true },
  });
  if (existing) {
    return pickAuthUser(existing.user);
  }

  if (!normalized.email) {
    throw new Error("This provider did not return a verified email address");
  }

  const byEmail = await prisma.user.findUnique({ where: { email: normalized.email } });
  if (byEmail) {
    await prisma.oAuthAccount.create({
      data: {
        userId: byEmail.id,
        provider,
        providerAccountId: normalized.providerAccountId,
        email: normalized.email,
      },
    });
    return pickAuthUser(byEmail);
  }

  const created = await prisma.user.create({
    data: {
      email: normalized.email,
      name: normalized.name,
      emailVerified: true,
      oauthAccounts: {
        create: {
          provider,
          providerAccountId: normalized.providerAccountId,
          email: normalized.email,
        },
      },
    },
  });
  return pickAuthUser(created);
}

function pickAuthUser(user: {
  id: number;
  name: string | null;
  email: string;
  createdAt: Date;
  totpEnabled: boolean;
}): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    totpEnabled: user.totpEnabled,
  };
}
