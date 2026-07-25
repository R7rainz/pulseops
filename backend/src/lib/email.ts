import nodemailer from "nodemailer";

export function getTransporter() {
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
  expiresAt?: Date | null;
}) {
  const transporter = getTransporter();

  if (!transporter) {
    const msg = `[EMAIL] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars. Skipping send to ${params.to}`;
    console.warn(msg);
    throw new Error(msg);
  }

  const from = process.env.SMTP_FROM || `"PulseOps" <${process.env.SMTP_USER}>`;
  const expiryLine = params.expiresAt
    ? `This invite expires on ${params.expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.`
    : "This invite does not expire.";

  try {
    const info = await transporter.sendMail({
      from,
      to: params.to,
      subject: `You've been invited to ${params.workspaceName} on PulseOps`,
      text: `Hello,

${params.invitedByName} has invited you to join "${params.workspaceName}" on PulseOps with the role of ${params.role}.

Click the link below to accept the invite:
${params.inviteLink}

${expiryLine}

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
      <p style="font-size: 11px; color: #71717a;">${expiryLine} If you don't have a PulseOps account, you'll be prompted to create one.</p>
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

export async function sendResetPasswordEmail(params: {
  to: string;
  resetLink: string;
}) {
  console.log(`[EMAIL] Reset link for ${params.to}: ${params.resetLink}`);

  const transporter = getTransporter();

  if (!transporter) {
    const msg = `[EMAIL] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars. Skipping password reset email to ${params.to}`;
    console.warn(msg);
    return;
  }

  const from = process.env.SMTP_FROM || `"PulseOps" <${process.env.SMTP_USER}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to: params.to,
      subject: "Reset your PulseOps password",
      text: `Hello,

You requested a password reset for your PulseOps account.

Click the link below to reset your password:
${params.resetLink}

This link expires in 1 hour.

If you didn't request this, you can safely ignore this email.

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
    .button { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #34d399; color: #09090b; text-decoration: none; font-weight: 800; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; border: 2px solid transparent; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #27272a; font-size: 10px; color: #52525b; letter-spacing: 0.1em; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">PulseOps — Password Reset</div>
    <div class="body">
      <p>You requested a password reset for your PulseOps account.</p>
      <a href="${params.resetLink}" class="button">Reset Password</a>
      <p style="font-size: 11px; color: #71717a;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">PulseOps · Infrastructure Monitoring Platform</div>
  </div>
</body>
</html>`,
    });

    console.log(`[EMAIL] Password reset email sent to ${params.to} — messageId: ${info.messageId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[EMAIL] Failed to send reset email to ${params.to}:`, msg);
  }
}

export async function sendMagicLinkEmail(params: {
  to: string;
  magicLink: string;
}) {
  // Log the link so passwordless sign-in works in dev without SMTP configured
  // (same convenience as the password-reset flow).
  console.log(`[EMAIL] Magic sign-in link for ${params.to}: ${params.magicLink}`);

  const transporter = getTransporter();

  if (!transporter) {
    const msg = `[EMAIL] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars. Skipping magic-link email to ${params.to}`;
    console.warn(msg);
    return;
  }

  const from = process.env.SMTP_FROM || `"PulseOps" <${process.env.SMTP_USER}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to: params.to,
      subject: "Your PulseOps sign-in link",
      text: `Hello,

Click the link below to sign in to PulseOps:
${params.magicLink}

This link expires in 15 minutes and can only be used once.

If you didn't request this, you can safely ignore this email.

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
    .button { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #34d399; color: #09090b; text-decoration: none; font-weight: 800; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; border: 2px solid transparent; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #27272a; font-size: 10px; color: #52525b; letter-spacing: 0.1em; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">PulseOps — Sign In</div>
    <div class="body">
      <p>Click below to sign in to your PulseOps account.</p>
      <a href="${params.magicLink}" class="button">Sign In</a>
      <p style="font-size: 11px; color: #71717a;">This link expires in 15 minutes and can only be used once. If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">PulseOps · Infrastructure Monitoring Platform</div>
  </div>
</body>
</html>`,
    });

    console.log(`[EMAIL] Magic-link email sent to ${params.to} — messageId: ${info.messageId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[EMAIL] Failed to send magic-link email to ${params.to}:`, msg);
  }
}
