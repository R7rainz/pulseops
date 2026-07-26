import crypto from "node:crypto";
import { CreateApiKeyInput } from "./api-key.schema";
import { prisma } from "../../lib/db";
import { sha256Hex } from "../../lib/hash";

function generateApiKey(): string {
  const prefix = "po_";
  const random = crypto.randomBytes(32).toString("hex");
  return `${prefix}${random}`;
}

// Non-secret leading fragment kept for display, e.g. "po_a1b2c3d4". Long enough
// to tell keys apart in a list, far too short to brute-force the remainder.
function keyPrefixOf(key: string): string {
  return key.slice(0, 11);
}

export async function createApiKeyService(
  userId: number,
  workspaceId: number,
  input: CreateApiKeyInput,
) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId, role: { in: ["OWNER", "ADMIN"] } },
  });

  if (!membership) throw new Error("Only workspace owners or admins can create API keys");

  const key = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      workspaceId,
      name: input.name,
      keyHash: sha256Hex(key),
      keyPrefix: keyPrefixOf(key),
      scope: input.scope,
    },
  });

  // The raw key is returned exactly once, here. It is not recoverable
  // afterwards — only its hash is stored.
  return { ...apiKey, key };
}

export async function getApiKeysService(
  userId: number,
  workspaceId: number,
) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
  });

  if (!membership) throw new Error("Workspace not found");

  const apiKeys = await prisma.apiKey.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scope: true,
      lastUsedAt: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return apiKeys;
}

export async function revokeApiKeyService(
  userId: number,
  keyId: number,
) {
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: keyId },
    include: {
      workspace: {
        include: {
          members: {
            where: { userId, role: { in: ["OWNER", "ADMIN"] } },
          },
        },
      },
    },
  });

  if (!apiKey || apiKey.workspace.members.length === 0) {
    throw new Error("API key not found or insufficient permissions");
  }

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { isActive: false },
  });
}
