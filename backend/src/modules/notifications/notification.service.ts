import { prisma } from "../../lib/db";
import {
  assertWorkspaceAccess,
  assertWorkspaceRole,
  type AccessContext,
} from "../../middleware/workspace-access.middleware";
import { getAdapter } from "./notification.dispatch";
import type { CreateChannelInput, UpdateChannelInput } from "./notification.schema";
import type { NotificationPayload } from "./types";

// Secrets live inside `config` (Slack/Discord webhook URLs, PagerDuty routing
// keys, webhook signing secrets). They are write-only: never returned to the
// client, so a workspace member with read access can't exfiltrate them.
const SECRET_CONFIG_KEYS = ["webhookUrl", "routingKey", "secret"];

function redactConfig(type: string, config: unknown): Record<string, unknown> {
  const source = (config ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (SECRET_CONFIG_KEYS.includes(key) && typeof value === "string" && value.length > 0) {
      // Enough to recognise which endpoint this is, not enough to reuse it.
      out[key] = `••••${value.slice(-4)}`;
    } else {
      out[key] = value;
    }
  }

  return out;
}

function present(channel: any) {
  return {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    events: channel.events,
    isActive: channel.isActive,
    config: redactConfig(channel.type, channel.config),
    failureCount: channel.failureCount,
    // Surfaces "this channel has been benched by the circuit breaker" in the UI.
    disabledUntil: channel.disabledUntil,
    lastDeliveredAt: channel.lastDeliveredAt,
    createdAt: channel.createdAt,
  };
}

export async function listChannelsService(access: AccessContext, workspaceId: number) {
  await assertWorkspaceAccess(access, workspaceId);

  const channels = await prisma.notificationChannel.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });

  return channels.map(present);
}

export async function createChannelService(
  userId: number,
  workspaceId: number,
  input: CreateChannelInput,
) {
  await assertWorkspaceRole(userId, workspaceId);

  // Adapter-level validation on top of the Zod shape — it owns provider
  // specifics like "this must be a hooks.slack.com URL".
  getAdapter(input.type).validate(input.config);

  const channel = await prisma.notificationChannel.create({
    data: {
      workspaceId,
      name: input.name,
      type: input.type,
      config: input.config as any,
      events: input.events,
      isActive: input.isActive,
    },
  });

  return present(channel);
}

export async function updateChannelService(
  userId: number,
  channelId: number,
  input: UpdateChannelInput,
) {
  const existing = await prisma.notificationChannel.findUnique({
    where: { id: channelId },
  });
  if (!existing) throw new Error("Channel not found");

  await assertWorkspaceRole(userId, existing.workspaceId);

  const type = input.type ?? existing.type;
  // Config is replaced wholesale rather than merged — merging a redacted value
  // back in would overwrite the real secret with the mask.
  const config = input.config ?? (existing.config as any);
  getAdapter(type).validate(config);

  const channel = await prisma.notificationChannel.update({
    where: { id: channelId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.config !== undefined && { config: input.config as any }),
      ...(input.events !== undefined && { events: input.events }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      // Any edit clears the breaker — the user has presumably just fixed it.
      failureCount: 0,
      disabledUntil: null,
    },
  });

  return present(channel);
}

export async function deleteChannelService(userId: number, channelId: number) {
  const existing = await prisma.notificationChannel.findUnique({
    where: { id: channelId },
  });
  if (!existing) throw new Error("Channel not found");

  await assertWorkspaceRole(userId, existing.workspaceId);

  await prisma.notificationChannel.delete({ where: { id: channelId } });
  return { id: channelId };
}

// Sends a representative alert so the user can confirm the channel works
// without waiting for a real outage.
export async function testChannelService(userId: number, channelId: number) {
  const channel = await prisma.notificationChannel.findUnique({
    where: { id: channelId },
  });
  if (!channel) throw new Error("Channel not found");

  await assertWorkspaceRole(userId, channel.workspaceId);

  const payload: NotificationPayload = {
    event: "incident.opened",
    incidentId: 0,
    monitorId: 0,
    workspaceId: channel.workspaceId,
    monitorName: "PulseOps test",
    monitorUrl: "https://example.com",
    status: "DOWN",
    title: "Test notification",
    message: "This is a test alert from PulseOps. If you can read this, the channel is configured correctly.",
    timestamp: new Date().toISOString(),
  };

  try {
    const result = await getAdapter(channel.type).send(channel.config as any, payload);

    await prisma.$transaction([
      prisma.notificationDeliveryLog.create({
        data: {
          channelId,
          event: "test",
          isSuccess: true,
          responseStatus: result.status ?? null,
          detail: result.detail ?? null,
        },
      }),
      prisma.notificationChannel.update({
        where: { id: channelId },
        data: { failureCount: 0, disabledUntil: null, lastDeliveredAt: new Date() },
      }),
    ]);

    return { ok: true, status: result.status ?? null };
  } catch (error) {
    const err = error as { response?: { status?: number }; message?: string };
    const detail = (err.message ?? "Unknown error").slice(0, 500);

    await prisma.notificationDeliveryLog
      .create({
        data: {
          channelId,
          event: "test",
          isSuccess: false,
          responseStatus: err.response?.status ?? null,
          detail,
        },
      })
      .catch(() => {});

    // A failed *test* is information, not a server error — report it as such
    // so the UI can show the provider's actual complaint.
    return { ok: false, status: err.response?.status ?? null, detail };
  }
}

export async function getChannelDeliveriesService(
  access: AccessContext,
  channelId: number,
  limit = 50,
) {
  const channel = await prisma.notificationChannel.findUnique({
    where: { id: channelId },
    select: { workspaceId: true },
  });
  if (!channel) throw new Error("Channel not found");

  await assertWorkspaceAccess(access, channel.workspaceId);

  return prisma.notificationDeliveryLog.findMany({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });
}
