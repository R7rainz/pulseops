import { z } from "zod";
import { prisma } from "../../lib/db";
import { redis } from "../../lib/redis";
import {
  assertWorkspaceAccess,
  assertWorkspaceRole,
  type AccessContext,
} from "../../middleware/workspace-access.middleware";

export const statusPageSchema = z.object({
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain lowercase letters, numbers and hyphens"),
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).nullable().optional(),
  isPublic: z.boolean().default(false),
  // Which monitors appear, in order. An empty list is valid — a page with
  // nothing published is how you take everything down without deleting it.
  monitors: z
    .array(
      z.object({
        monitorId: z.number().int(),
        displayName: z.string().max(100).nullable().optional(),
      }),
    )
    .default([]),
});

export type StatusPageInput = z.infer<typeof statusPageSchema>;

// Bad input, not a server fault. Fastify's default error handler already
// honours `statusCode` when it's below 500, so tagging the error is enough to
// surface the real reason instead of a generic 500.
function badRequest(message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode: 400 });
}

// The public route caches by slug; any edit must drop that entry or the change
// is invisible for up to the TTL.
async function invalidate(slug: string | undefined) {
  if (!slug) return;
  await redis.del(`status-page:${slug}`).catch(() => {});
}

export async function getStatusPageService(access: AccessContext, workspaceId: number) {
  await assertWorkspaceAccess(access, workspaceId);

  return prisma.statusPage.findUnique({
    where: { workspaceId },
    include: {
      entries: {
        orderBy: { position: "asc" },
        include: { monitor: { select: { id: true, name: true, status: true, isActive: true } } },
      },
    },
  });
}

export async function upsertStatusPageService(
  userId: number,
  workspaceId: number,
  input: StatusPageInput,
) {
  await assertWorkspaceRole(userId, workspaceId);

  // Every published monitor must belong to this workspace — otherwise a page
  // could be used to expose another tenant's monitor status publicly.
  if (input.monitors.length > 0) {
    const owned = await prisma.monitor.findMany({
      where: { id: { in: input.monitors.map((m) => m.monitorId) }, workspaceId },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((m) => m.id));
    const foreign = input.monitors.filter((m) => !ownedIds.has(m.monitorId));
    if (foreign.length > 0) {
      throw badRequest("One or more selected monitors do not belong to this workspace");
    }
  }

  const existing = await prisma.statusPage.findUnique({
    where: { workspaceId },
    select: { id: true, slug: true },
  });

  // Slugs are globally unique (they're the public URL), so a clash has to be a
  // clear error rather than a raw constraint violation.
  const slugOwner = await prisma.statusPage.findUnique({
    where: { slug: input.slug },
    select: { workspaceId: true },
  });
  if (slugOwner && slugOwner.workspaceId !== workspaceId) {
    throw badRequest(`The slug "${input.slug}" is already taken`);
  }

  const page = await prisma.$transaction(async (tx) => {
    const saved = await tx.statusPage.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        slug: input.slug,
        title: input.title,
        description: input.description ?? null,
        isPublic: input.isPublic,
      },
      update: {
        slug: input.slug,
        title: input.title,
        description: input.description ?? null,
        isPublic: input.isPublic,
      },
    });

    // Replace the entry set wholesale — simpler and more predictable than
    // diffing, and the list is small.
    await tx.statusPageMonitor.deleteMany({ where: { statusPageId: saved.id } });
    if (input.monitors.length > 0) {
      await tx.statusPageMonitor.createMany({
        data: input.monitors.map((m, index) => ({
          statusPageId: saved.id,
          monitorId: m.monitorId,
          displayName: m.displayName ?? null,
          position: index,
        })),
      });
    }

    return saved;
  });

  // Drop both the old and new slug's cache entries — a rename leaves a stale
  // page served under the previous URL otherwise.
  await invalidate(existing?.slug);
  await invalidate(page.slug);

  return page;
}

export async function deleteStatusPageService(userId: number, workspaceId: number) {
  await assertWorkspaceRole(userId, workspaceId);

  const existing = await prisma.statusPage.findUnique({
    where: { workspaceId },
    select: { slug: true },
  });
  if (!existing) return { deleted: false };

  await prisma.statusPage.delete({ where: { workspaceId } });
  await invalidate(existing.slug);

  return { deleted: true };
}
