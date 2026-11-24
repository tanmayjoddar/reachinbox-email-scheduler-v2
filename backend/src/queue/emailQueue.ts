import { Queue } from 'bullmq';
import { createRedis } from '../redis/connection';

export interface EmailJob {
  emailId: string;
}

export const emailQueue = new Queue<EmailJob>('emails', {
  connection: createRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400 },
  },
});

const CHUNK = 500;

export async function addEmailJobs(emails: { id: string; scheduledAt: Date }[]) {
  for (let i = 0; i < emails.length; i += CHUNK) {
    const chunk = emails.slice(i, i + CHUNK);
    await emailQueue.addBulk(
      chunk.map((email) => ({
        name: 'send',
        data: { emailId: email.id },
        opts: {
          jobId: email.id,
          delay: Math.max(0, email.scheduledAt.getTime() - Date.now()),
        },
      })),
    );
  }
}
