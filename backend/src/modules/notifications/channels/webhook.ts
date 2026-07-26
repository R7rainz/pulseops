import crypto from "node:crypto";
import axios from "axios";
import { assertPublicUrl } from "../../../lib/ssrf";
import { ChannelConfigError, type ChannelAdapter, type NotificationPayload } from "../types";

// Generic HTTP webhook — the original (and previously only) transport.
// Preserved with the same signing scheme and headers so existing consumers
// keep working after the move to channels.
export const webhookAdapter: ChannelAdapter = {
  validate(config: any) {
    if (!config?.url || typeof config.url !== "string") {
      throw new ChannelConfigError("Webhook channel requires a url");
    }
  },

  async send(config: { url: string; secret?: string }, payload: NotificationPayload) {
    await assertPublicUrl(config.url);

    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", config.secret || "")
      .update(body)
      .digest("hex");

    const response = await axios.post(config.url, payload, {
      timeout: 5000,
      maxRedirects: 0,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "PulseOps-Webhook/1.0",
        "X-PulseOps-Signature": signature,
        "X-PulseOps-Event": payload.event,
        "X-PulseOps-Timestamp": payload.timestamp,
        // Lets consumers dedup retries — the old payload carried no delivery id.
        "X-PulseOps-Delivery": `${payload.incidentId}:${payload.event}`,
      },
    });

    return {
      ok: true,
      status: response.status,
      detail: typeof response.data === "string" ? response.data.slice(0, 500) : null,
    };
  },
};
