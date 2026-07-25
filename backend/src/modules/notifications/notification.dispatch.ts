import { prisma } from "../../lib/db";
import { webhookLogsQueue } from "../webhooks/webhook.queue";
import { discordAdapter } from "./channels/discord";
import { emailAdapter } from "./channels/email";
import { pagerdutyAdapter } from "./channels/pagerduty";
import { slackAdapter } from "./channels/slack";
import { webhookAdapter } from "./channels/webhook";
import type { ChannelAdapter, NotificationPayload } from "./types";

export const ADAPTERS: Record<string, ChannelAdapter> = {
  EMAIL: emailAdapter,
  SLACK: slackAdapter,
  DISCORD: discordAdapter,
  PAGERDUTY: pagerdutyAdapter,
  WEBHOOK: webhookAdapter,
};

// Circuit breaker. A permanently dead endpoint was previously retried on every
// single incident forever; after this many consecutive failures the channel is
// benched for a while instead.
const FAILURE_THRESHOLD = 10;
const BREAKER_COOLDOWN_MS = 60 * 60 * 1000;

export function getAdapter(type: string): ChannelAdapter {
  const adapter = ADAPTERS[type];
  if (!adapter) throw new Error(`Unsupported channel type: ${type}`);
  return adapter;
}

/**
 * Fans a notification out to every matching channel in the workspace.
 *
 * Never throws: alerting must not be able to fail a check-result transaction.
 */
export async function dispatchNotification(
  workspaceId: number,
  payload: NotificationPayload,
): Promise<void> {
  const now = new Date();

  const channels = await prisma.notificationChannel.findMany({
    where: {
      workspaceId,
      isActive: true,
      events: { has: payload.event },
      // Skip channels currently tripped by the breaker.
      OR: [{ disabledUntil: null }, { disabledUntil: { lte: now } }],
    },
  });

  if (channels.length === 0) return;

  await Promise.allSettled(
    channels.map((channel) => deliverToChannel(channel, payload)),
  );
}

async function deliverToChannel(
  channel: {
    id: number;
    type: string;
    config: unknown;
    failureCount: number;
  },
  payload: NotificationPayload,
): Promise<void> {
  try {
    const adapter = getAdapter(channel.type);
    const result = await adapter.send(channel.config as any, payload);

    await prisma.$transaction([
      prisma.notificationDeliveryLog.create({
        data: {
          channelId: channel.id,
          event: payload.event,
          isSuccess: true,
          responseStatus: result.status ?? null,
          detail: result.detail ?? null,
        },
      }),
      // A success closes the breaker.
      prisma.notificationChannel.update({
        where: { id: channel.id },
        data: { failureCount: 0, disabledUntil: null, lastDeliveredAt: new Date() },
      }),
    ]);
  } catch (error) {
    const err = error as { response?: { status?: number }; message?: string };
    const status = err.response?.status ?? null;
    const detail = (err.message ?? "Unknown error").slice(0, 500);

    const failureCount = channel.failureCount + 1;
    const tripped = failureCount >= FAILURE_THRESHOLD;

    await prisma.$transaction([
      prisma.notificationDeliveryLog.create({
        data: {
          channelId: channel.id,
          event: payload.event,
          isSuccess: false,
          responseStatus: status,
          detail,
        },
      }),
      prisma.notificationChannel.update({
        where: { id: channel.id },
        data: {
          failureCount,
          disabledUntil: tripped ? new Date(Date.now() + BREAKER_COOLDOWN_MS) : null,
        },
      }),
    ]).catch(() => {});

    if (tripped) {
      console.error(
        `[NOTIFY] Channel ${channel.id} (${channel.type}) failed ${failureCount}x — ` +
          `paused for ${BREAKER_COOLDOWN_MS / 60000}m. Last error: ${detail}`,
      );
      // A benched channel shouldn't also be queued for retry.
      return;
    }

    console.log(`[NOTIFY] Channel ${channel.id} (${channel.type}) failed — queuing retry: ${detail}`);

    // Reuses the existing BullMQ retry queue (5 attempts, exponential backoff
    // from 60s) rather than a second retry mechanism.
    await webhookLogsQueue
      .add(
        "retry-channel-delivery",
        { channelId: channel.id, payload },
        { attempts: 5, backoff: { type: "exponential", delay: 60_000 } },
      )
      .catch((queueError) =>
        console.error("[NOTIFY] Could not queue retry:", (queueError as Error).message),
      );
  }
}
