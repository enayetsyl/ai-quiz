import nodemailer from "nodemailer";

type MailOptions = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  // Use SMTP if configured, otherwise create a test account
  const host = process.env.SMTP_HOST;
  if (host) {
    transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter;
  }

  // fallback: ethereal test account
  // Creating test account is async; create a transporter that logs to console instead
  transporter = nodemailer.createTransport({ jsonTransport: true });
  return transporter;
}

export async function sendMail(opts: MailOptions) {
  const t = getTransporter();
  return t.sendMail({
    from: process.env.SMTP_FROM || "no-reply@example.com",
    ...opts,
  });
}

export default { sendMail };

