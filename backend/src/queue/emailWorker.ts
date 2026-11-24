import { Worker, DelayedError } from 'bullmq';
import { createRedis } from '../redis/connection';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { claimEmail, getEmailStatus, releaseEmail, markSent, markFailed } from '../services/emailStore';
import { reserveSlot } from '../services/rateLimiter';
import { sendMail, type Mail } from '../services/mailer';
import { updateEmailDoc } from '../services/searchService';
import { notifyRateLimit } from '../services/slackService';
import { nextHourStart } from '../utils/time';
import type { Sender } from '../services/senders';
import type { EmailJob } from './emailQueue';

export const emailWorker = new Worker<EmailJob>(
  'emails',
  async (job, token) => {
    const email = await claimEmail(job.data.emailId);
    if (!email) {
      const status = await getEmailStatus(job.data.emailId);
      if (status === 'processing') {
        // Another worker holds the row, or a crashed one has not gone stale yet: move it, never complete it.
        await job.moveToDelayed(Date.now() + 30_000, token);
        logger.info({ emailId: job.data.emailId, retryInMs: 30_000 }, 'job delayed: email still processing');
        throw new DelayedError();
      }
      return;
    }

    const slot = await reserveSlot(email.sender_id, email.batch_id, email.hourly_limit, email.delay_ms);
    if (!slot.allowed) {
      const retryAt = new Date(slot.retryAt);
      await releaseEmail(email.id, retryAt);
      await job.moveToDelayed(slot.retryAt, token);
      if (slot.reason === 'limit') {
        notifyRateLimit(
          email.user_id,
          { id: email.sender_id, email: email.sender_email },
          { scope: slot.scope, value: slot.scope === 'sender' ? env.MAX_EMAILS_PER_HOUR_PER_SENDER : email.hourly_limit },
          nextHourStart(Date.now()),
        );
      }
      logger.info(
        { emailId: email.id, reason: slot.reason, scope: slot.reason === 'limit' ? slot.scope : undefined, retryAt },
        'job delayed: rate limit',
      );
      throw new DelayedError();
    }

    const sender: Sender = {
      id: email.sender_id,
      email: email.sender_email,
      smtp_host: email.smtp_host,
      smtp_port: email.smtp_port,
      smtp_user: email.smtp_user,
      smtp_pass: email.smtp_pass,
    };
    const mail: Mail = { to: email.recipient, subject: email.subject, body: email.body };

    try {
      const messageId = await sendMail(sender, mail);
      const sentAt = await markSent(email.id, messageId);
      updateEmailDoc(email.id, { status: 'sent', sentAt }).catch((err) =>
        logger.warn({ err, emailId: email.id }, 'elasticsearch update failed'),
      );
      logger.info({ emailId: email.id, recipient: email.recipient }, 'email sent');
    } catch (err) {
      const attempts = job.attemptsMade + 1;
      if (attempts < (job.opts.attempts ?? 1)) {
        await releaseEmail(email.id, email.scheduled_at);
        throw err;
      }
      await markFailed(email.id, err instanceof Error ? err.message : String(err));
      updateEmailDoc(email.id, { status: 'failed', sentAt: null }).catch((updateErr) =>
        logger.warn({ err: updateErr, emailId: email.id }, 'elasticsearch update failed'),
      );
      logger.error({ err, emailId: email.id }, 'email failed permanently');
    }
  },
  { connection: createRedis(), concurrency: env.WORKER_CONCURRENCY, autorun: false },
);
