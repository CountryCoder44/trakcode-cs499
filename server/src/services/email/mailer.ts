import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env';

// Outgoing email. In production this sends through Google Workspace's SMTP
// server (see env.ts for the settings). With no SMTP settings it prints the
// email to the server log instead, so local dev and tests never send real mail.

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailTransport {
  send(email: OutgoingEmail): Promise<void>;
}

const consoleTransport: MailTransport = {
  async send(email) {
    // eslint-disable-next-line no-console
    console.log(`\n[email not sent: SMTP is not configured]\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`);
  },
};

function smtpTransport(): MailTransport {
  const transporter: Transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // 465 = TLS from the start; 587 upgrades with STARTTLS
    requireTLS: env.SMTP_PORT !== 465, // never fall back to sending in the clear
    // Google's SMTP relay identifies the sender by IP and expects a real name
    // in the greeting, not the container's hostname.
    name: env.SMTP_HELO_NAME,
    // Login is optional: the relay authorizes the server's IP address instead.
    ...(env.SMTP_USER && env.SMTP_PASS ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {}),
  });
  return {
    async send(email) {
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        replyTo: env.EMAIL_REPLY_TO,
        to: email.to,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
    },
  };
}

export function emailConfigured(): boolean {
  return Boolean(env.SMTP_HOST);
}

let transport: MailTransport | null = null;

function currentTransport(): MailTransport {
  if (!transport) transport = emailConfigured() ? smtpTransport() : consoleTransport;
  return transport;
}

/** Test hook: capture emails instead of sending them. Pass nothing to reset. */
export function setMailTransport(t?: MailTransport): void {
  transport = t ?? null;
}

export async function sendEmail(email: OutgoingEmail): Promise<void> {
  await currentTransport().send(email);
}
