import crypto from "node:crypto";
import { CreateApiKeyInput } from "./api-key.schema";
import { prisma } from "../../lib/db";

function generateApiKey(): string {
  const prefix = "po_";
  const random = crypto.randomBytes(32).toString("hex");
  return `${prefix}${random}`;
}

export async function createApiKeyService(
  userId: number,
  workspaceId: number,
  input: CreateApiKeyInput,
) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId, role: "OWNER" },
  });

  if (!membership) throw new Error("Only workspace owners can create API keys");

  const key = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      workspaceId,
      name: input.name,
      key,
    },
  });

  return apiKey;
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
            where: { userId, role: "OWNER" },
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
