import nodemailer, { Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;
let usingEthereal = false;

export function getAppUrl(): string {
  // Explicit override wins; otherwise auto-detect the public URL the host
  // injects, so signing/download links in emails are clickable in production.
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "");
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return "http://localhost:3000";
}

function getMailFrom(): string {
  return process.env.MAIL_FROM || "no-reply@docusign-clone.local";
}

async function getTransporter(): Promise<Transporter> {
  if (cachedTransporter) return cachedTransporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    usingEthereal = false;
    return cachedTransporter;
  }

  // No SMTP creds configured -> fall back to an Ethereal test account so the
  // demo always "sends" email and prints a preview URL.
  const testAccount = await nodemailer.createTestAccount();
  cachedTransporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  usingEthereal = true;
  // eslint-disable-next-line no-console
  console.log(
    `[email] No SMTP_* env vars set — using Ethereal test account (${testAccount.user}). Preview URLs will be logged for each message.`
  );
  return cachedTransporter;
}

async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: getMailFrom(),
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });

  if (usingEthereal) {
    const preview = nodemailer.getTestMessageUrl(info);
    // eslint-disable-next-line no-console
    console.log(`[email] Sent "${opts.subject}" to ${opts.to}. Preview: ${preview}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[email] Sent "${opts.subject}" to ${opts.to}.`);
  }
  return info;
}

export async function sendSigningInvite(params: {
  to: string;
  recipientName: string;
  documentTitle: string;
  token: string;
}) {
  const link = `${getAppUrl()}/sign/${params.token}`;
  const subject = `Please sign: ${params.documentTitle}`;
  const text = `Hi ${params.recipientName},\n\nYou have a document to sign: "${params.documentTitle}".\n\nOpen this link to review and sign:\n${link}\n`;
  const html = `
    <div style="font-family:sans-serif;line-height:1.5">
      <p>Hi ${escapeHtml(params.recipientName)},</p>
      <p>You have a document to sign: <strong>${escapeHtml(params.documentTitle)}</strong>.</p>
      <p><a href="${link}" style="display:inline-block;background:#F89406;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Review &amp; Sign</a></p>
      <p style="color:#666;font-size:13px">Or paste this link into your browser:<br>${link}</p>
    </div>`;
  return sendMail({ to: params.to, subject, html, text });
}

export async function sendCompletedNotice(params: {
  to: string;
  documentTitle: string;
  documentId: string;
}) {
  const link = `${getAppUrl()}/api/documents/${params.documentId}/download`;
  const subject = `Completed: ${params.documentTitle}`;
  const text = `All recipients have signed "${params.documentTitle}".\n\nDownload the signed PDF:\n${link}\n`;
  const html = `
    <div style="font-family:sans-serif;line-height:1.5">
      <p>Good news — all recipients have signed <strong>${escapeHtml(params.documentTitle)}</strong>.</p>
      <p><a href="${link}" style="display:inline-block;background:#2980B9;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Download signed PDF</a></p>
      <p style="color:#666;font-size:13px">Or paste this link into your browser:<br>${link}</p>
    </div>`;
  return sendMail({ to: params.to, subject, html, text });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
