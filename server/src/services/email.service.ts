import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    console.warn(
      `[Email] SMTP not configured. Would have sent to ${options.to}: "${options.subject}"`,
    );
    return false;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@spendlens.app";

  try {
    await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    console.log(`[Email] Sent to ${options.to}: "${options.subject}"`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send to ${options.to}:`, error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "SpendLens - Reset Your Password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e293b; margin-bottom: 16px;">Reset Your Password</h2>
        <p style="color: #475569; line-height: 1.6;">
          You requested a password reset for your SpendLens account. Click the button below to set a new password.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
             style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
          This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
        </p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          If the button doesn't work, copy and paste this URL into your browser:<br/>
          <a href="${resetUrl}" style="color: #4f46e5; word-break: break-all;">${resetUrl}</a>
        </p>
      </div>
    `,
    text: `Reset your SpendLens password by visiting this link: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  });
}
