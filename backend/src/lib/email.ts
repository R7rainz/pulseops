import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendInviteEmail(params: {
  to: string;
  workspaceName: string;
  inviteLink: string;
  role: string;
  invitedByName: string;
}) {
  const transporter = getTransporter();

  if (!transporter) {
    const msg = `[EMAIL] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars. Skipping send to ${params.to}`;
    console.warn(msg);
    throw new Error(msg);
  }

  const from = process.env.SMTP_FROM || `"PulseOps" <${process.env.SMTP_USER}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to: params.to,
      subject: `You've been invited to ${params.workspaceName} on PulseOps`,
      text: `Hello,

${params.invitedByName} has invited you to join "${params.workspaceName}" on PulseOps with the role of ${params.role}.

Click the link below to accept the invite:
${params.inviteLink}

This invite expires in 7 days.

— PulseOps`,
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Courier New', monospace; background: #09090b; color: #fafafa; padding: 40px; }
    .container { max-width: 480px; margin: 0 auto; border: 2px solid #27272a; padding: 32px; background: #09090b; }
    .header { font-size: 14px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: #34d399; margin-bottom: 24px; border-bottom: 2px solid #27272a; padding-bottom: 16px; }
    .body { font-size: 13px; line-height: 1.6; color: #a1a1aa; }
    .role-badge { display: inline-block; border: 1px solid #22d3ee; color: #22d3ee; padding: 2px 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
    .button { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #34d399; color: #09090b; text-decoration: none; font-weight: 800; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; border: 2px solid transparent; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #27272a; font-size: 10px; color: #52525b; letter-spacing: 0.1em; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">PulseOps — Access Invite</div>
    <div class="body">
      <p><strong style="color: #e4e4e7;">${params.invitedByName}</strong> has invited you to join</p>
      <p style="font-size: 18px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #fafafa; margin: 16px 0;">
        ${params.workspaceName}
      </p>
      <p>with role <span class="role-badge">${params.role}</span></p>
      <a href="${params.inviteLink}" class="button">Accept Invite</a>
      <p style="font-size: 11px; color: #71717a;">This invite expires in 7 days. If you don't have a PulseOps account, you'll be prompted to create one.</p>
    </div>
    <div class="footer">PulseOps · Infrastructure Monitoring Platform</div>
  </div>
</body>
</html>`,
    });

    console.log(`[EMAIL] Invite sent to ${params.to} — messageId: ${info.messageId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[EMAIL] Failed to send to ${params.to}:`, msg);
    throw new Error(`SMTP send failed: ${msg}`);
  }
}
