import axios from "axios";
import { assertPublicUrl } from "../../../lib/ssrf";
import {
  ChannelConfigError,
  formatDuration,
  headlineOf,
  severityOf,
  type ChannelAdapter,
  type NotificationPayload,
} from "../types";

// Slack incoming webhook. Renders Block Kit rather than posting the raw
// PulseOps payload, so the message is actually readable in a channel.
export const slackAdapter: ChannelAdapter = {
  validate(config: any) {
    if (!config?.webhookUrl || typeof config.webhookUrl !== "string") {
      throw new ChannelConfigError("Slack channel requires a webhookUrl");
    }
    if (!/^https:\/\/hooks\.slack\.com\//.test(config.webhookUrl)) {
      throw new ChannelConfigError("webhookUrl must be a https://hooks.slack.com/ incoming webhook URL");
    }
  },

  async send(config: { webhookUrl: string }, payload: NotificationPayload) {
    await assertPublicUrl(config.webhookUrl);

    const emoji =
      severityOf(payload) === "ok" ? ":large_green_circle:"
        : severityOf(payload) === "warning" ? ":large_yellow_circle:"
          : ":red_circle:";

    const duration = formatDuration(payload.durationMs);

    const fields = [
      { type: "mrkdwn", text: `*Monitor*\n${payload.monitorName}` },
      { type: "mrkdwn", text: `*Status*\n${payload.status}` },
    ];
    if (payload.monitorUrl) {
      fields.push({ type: "mrkdwn", text: `*Target*\n${payload.monitorUrl}` });
    }
    if (duration) {
      fields.push({ type: "mrkdwn", text: `*Duration*\n${duration}` });
    }

    const response = await axios.post(
      config.webhookUrl,
      {
        // Fallback text for notifications//screen readers.
        text: `${emoji} ${headlineOf(payload)} — ${payload.message}`,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: `${emoji} ${headlineOf(payload)}`.slice(0, 150) },
          },
          { type: "section", fields },
          {
            type: "context",
            elements: [{ type: "mrkdwn", text: `${payload.title} · <!date^${Math.floor(new Date(payload.timestamp).getTime() / 1000)}^{date_short_pretty} {time}|${payload.timestamp}>` }],
          },
        ],
      },
      { timeout: 5000, maxRedirects: 0 },
    );

    return { ok: true, status: response.status, detail: null };
  },
};
