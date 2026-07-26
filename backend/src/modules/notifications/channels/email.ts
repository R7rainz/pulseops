import { getTransporter } from "../../../lib/email";
import {
  ChannelConfigError,
  formatDuration,
  headlineOf,
  severityOf,
  type ChannelAdapter,
  type NotificationPayload,
} from "../types";

const ACCENT = {
  ok: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
} as const;

// Email alerts. lib/email.ts already owned the SMTP transport for invites and
// password resets — it just was never wired to incidents, so there was no way
// to be emailed when something went down.
export const emailAdapter: ChannelAdapter = {
  validate(config: any) {
    if (!config?.to || typeof config.to !== "string") {
      throw new ChannelConfigError("Email channel requires a 'to' address");
    }
    const recipients = String(config.to).split(",").map((s) => s.trim()).filter(Boolean);
    if (recipients.length === 0) {
      throw new ChannelConfigError("Email channel requires at least one recipient");
    }
    for (const address of recipients) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
        throw new ChannelConfigError(`"${address}" is not a valid email address`);
      }
    }
  },

  async send(config: { to: string }, payload: NotificationPayload) {
    const transporter = getTransporter();
    if (!transporter) {
      throw new Error(
        "SMTP is not configured — set SMTP_HOST, SMTP_USER and SMTP_PASS to send email alerts",
      );
    }

    const accent = ACCENT[severityOf(payload)];
    const duration = formatDuration(payload.durationMs);
    const from = process.env.SMTP_FROM || `"PulseOps" <${process.env.SMTP_USER}>`;
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const incidentUrl = `${appUrl}/workspaces/${payload.workspaceId}/incidents/${payload.incidentId}`;

    const rows = [
      ["Monitor", payload.monitorName],
      ["Status", payload.status],
      payload.monitorUrl ? ["Target", payload.monitorUrl] : null,
      duration ? ["Duration", duration] : null,
      ["When", new Date(payload.timestamp).toUTCString()],
    ].filter(Boolean) as [string, string][];

    const html = `
      <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#09090b;color:#fafafa;padding:32px">
        <div style="max-width:560px;margin:0 auto;border:1px solid #27272a;background:#18181b">
          <div style="border-left:4px solid ${accent};padding:20px 24px">
            <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#a1a1aa">PulseOps Alert</div>
            <div style="font-size:20px;font-weight:600;margin-top:6px;color:${accent}">${escapeHtml(headlineOf(payload))}</div>
            <p style="color:#d4d4d8;font-size:14px;line-height:1.6;margin:14px 0 0">${escapeHtml(payload.message)}</p>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            ${rows
              .map(
                ([k, v]) => `<tr>
                  <td style="padding:10px 24px;color:#71717a;border-top:1px solid #27272a;width:120px">${escapeHtml(k)}</td>
                  <td style="padding:10px 24px;color:#fafafa;border-top:1px solid #27272a">${escapeHtml(v)}</td>
                </tr>`,
              )
              .join("")}
          </table>
          <div style="padding:20px 24px;border-top:1px solid #27272a">
            <a href="${incidentUrl}" style="display:inline-block;background:${accent};color:#09090b;padding:10px 18px;font-weight:600;font-size:13px;text-decoration:none">View incident</a>
          </div>
        </div>
      </div>
    `;

    const text = [
      headlineOf(payload),
      "",
      payload.message,
      "",
      ...rows.map(([k, v]) => `${k}: ${v}`),
      "",
      incidentUrl,
    ].join("\n");

    const info = await transporter.sendMail({
      from,
      to: config.to,
      subject: `[PulseOps] ${headlineOf(payload)}`,
      text,
      html,
    });

    return { ok: true, status: null, detail: info.messageId ?? null };
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
