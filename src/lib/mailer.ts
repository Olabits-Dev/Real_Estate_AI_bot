import nodemailer from "nodemailer";

function getSmtpPort() {
  const value = process.env.SMTP_PORT;
  if (!value) return 587;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 587 : parsed;
}

function getMailer() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.");
  }

  return nodemailer.createTransport({
    host,
    port: getSmtpPort(),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

export async function sendIntegrationSnippetEmail({
  to,
  companyName,
  snippet,
}: {
  to: string;
  companyName: string;
  snippet: string;
}) {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  if (!from) {
    throw new Error("SMTP_FROM or SMTP_USER must be set.");
  }

  const transporter = getMailer();

  await transporter.sendMail({
    from,
    to,
    subject: `Olabits EstateBot Integration Snippet - ${companyName}`,
    text: `Integration Ready for ${companyName}.\n\nPaste this into your <body> tag:\n${snippet}`,
    html: `<p>Integration Ready for <strong>${companyName}</strong>.</p><p>Paste this code into your <code>&lt;body&gt;</code> tag:</p><pre style="padding:12px;background:#f1f5f9;border-radius:8px;overflow:auto;">${snippet
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</pre>`,
  });
}
