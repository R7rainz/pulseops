import axios from "axios";
import {
  ChannelConfigError,
  severityOf,
  type ChannelAdapter,
  type NotificationPayload,
} from "../types";

const EVENTS_API = "https://events.pagerduty.com/v2/enqueue";

// PagerDuty Events API v2.
//
// The dedup_key is derived from the incident id, which is what lets a resolve
// event close the alert PagerDuty opened — without it every notification would
// create a new incident and nothing would ever auto-resolve.
export const pagerdutyAdapter: ChannelAdapter = {
  validate(config: any) {
    if (!config?.routingKey || typeof config.routingKey !== "string") {
      throw new ChannelConfigError("PagerDuty channel requires a routingKey (Events API v2 integration key)");
    }
    if (config.routingKey.length < 20) {
      throw new ChannelConfigError("routingKey does not look like a PagerDuty Events API v2 integration key");
    }
  },

  async send(config: { routingKey: string }, payload: NotificationPayload) {
    const dedupKey = `pulseops-incident-${payload.incidentId}`;

    const eventAction = payload.event === "incident.resolved"
      ? "resolve"
      : payload.event === "incident.acknowledged"
        ? "acknowledge"
        : "trigger";

    const body: Record<string, unknown> = {
      routing_key: config.routingKey,
      event_action: eventAction,
      dedup_key: dedupKey,
    };

    // Only trigger events carry a full payload; resolve/acknowledge just
    // reference the dedup key.
    if (eventAction === "trigger") {
      body.payload = {
        summary: `${payload.monitorName}: ${payload.message}`.slice(0, 1024),
        source: payload.monitorUrl || payload.monitorName,
        severity: severityOf(payload) === "warning" ? "warning" : "critical",
        timestamp: payload.timestamp,
        component: "monitor",
        group: `workspace-${payload.workspaceId}`,
        class: payload.status,
        custom_details: {
          monitorId: payload.monitorId,
          incidentId: payload.incidentId,
          title: payload.title,
        },
      };
    }

    const response = await axios.post(EVENTS_API, body, {
      timeout: 5000,
      maxRedirects: 0,
    });

    return { ok: true, status: response.status, detail: null };
  },
};
