import axios from "axios";
import { assertPublicUrl } from "../../../lib/ssrf";
import {
  ChannelConfigError,
  colorOf,
  formatDuration,
  headlineOf,
  type ChannelAdapter,
  type NotificationPayload,
} from "../types";

// Discord incoming webhook, rendered as an embed.
export const discordAdapter: ChannelAdapter = {
  validate(config: any) {
    if (!config?.webhookUrl || typeof config.webhookUrl !== "string") {
      throw new ChannelConfigError("Discord channel requires a webhookUrl");
    }
    if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(config.webhookUrl)) {
      throw new ChannelConfigError("webhookUrl must be a https://discord.com/api/webhooks/ URL");
    }
  },

  async send(config: { webhookUrl: string }, payload: NotificationPayload) {
    await assertPublicUrl(config.webhookUrl);

    const duration = formatDuration(payload.durationMs);

    const fields: { name: string; value: string; inline: boolean }[] = [
      { name: "Status", value: payload.status, inline: true },
    ];
    if (payload.monitorUrl) {
      fields.push({ name: "Target", value: payload.monitorUrl, inline: true });
    }
    if (duration) {
      fields.push({ name: "Duration", value: duration, inline: true });
    }

    const response = await axios.post(
      config.webhookUrl,
      {
        username: "PulseOps",
        embeds: [
          {
            title: headlineOf(payload).slice(0, 250),
            description: payload.message.slice(0, 4000),
            color: colorOf(payload),
            fields,
            timestamp: payload.timestamp,
            footer: { text: payload.title.slice(0, 2000) },
          },
        ],
      },
      { timeout: 5000, maxRedirects: 0 },
    );

    // Discord returns 204 No Content on success.
    return { ok: true, status: response.status, detail: null };
  },
};
