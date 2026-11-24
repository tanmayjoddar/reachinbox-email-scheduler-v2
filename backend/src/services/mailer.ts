import nodemailer, { type Transporter } from 'nodemailer';
import type { Sender } from './senders';

const transports = new Map<string, Transporter>();

function transportFor(sender: Sender) {
  let transport = transports.get(sender.id);
  if (!transport) {
    transport = nodemailer.createTransport({
      host: sender.smtp_host,
      port: sender.smtp_port,
      secure: sender.smtp_port === 465,
      auth: { user: sender.smtp_user, pass: sender.smtp_pass },
      // A send must fail well before the 60s stale-claim window or two workers could send the same email.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    transports.set(sender.id, transport);
  }
  return transport;
}

export interface Mail {
  to: string;
  subject: string;
  body: string;
}

export async function sendMail(sender: Sender, mail: Mail): Promise<string> {
  const info = await transportFor(sender).sendMail({
    from: sender.email,
    to: mail.to,
    subject: mail.subject,
    text: mail.body,
  });
  return info.messageId;
}
