import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { listSenders } from '../services/senders';
import { scheduleEmails, type ScheduleInput } from '../services/scheduleEmails';
import { listEmails } from '../services/emailStore';
import { searchEmails } from '../services/searchService';
import { logger } from '../utils/logger';

const scheduleSchema = z.object({
  subject: z.string().trim().min(1),
  body: z.string().min(1),
  recipients: z.array(z.string().trim().toLowerCase().email()).min(1).max(5000),
  startTime: z.string().datetime({ offset: true }),
  delayBetweenMs: z.number().int().nonnegative(),
  hourlyLimit: z.number().int().positive(),
});

const listSchema = z.object({
  status: z.enum(['scheduled', 'sent']).default('scheduled'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const searchSchema = z.object({
  q: z.string().trim().min(1),
  status: z.enum(['scheduled', 'sent']).optional(),
});

export const emailRoutes = Router();

emailRoutes.post('/schedule', requireAuth, async (req, res) => {
  const input = scheduleSchema.parse(req.body);
  const senders = await listSenders();
  if (!senders.length) {
    res.status(409).json({ error: 'no senders configured; run npm run seed:senders' });
    return;
  }
  const recipients = [...new Set(input.recipients)];
  const result = await scheduleEmails(req.userId!, { ...input, recipients } satisfies ScheduleInput, senders);
  res.status(201).json(result);
});

emailRoutes.get('/search', requireAuth, async (req, res) => {
  const query = searchSchema.parse(req.query);
  try {
    const items = await searchEmails({ userId: req.userId!, ...query });
    res.json({ items });
  } catch (err) {
    logger.error({ err }, 'elasticsearch search failed');
    res.status(503).json({ message: 'search unavailable' });
  }
});

emailRoutes.get('/', requireAuth, async (req, res) => {
  const query = listSchema.parse(req.query);
  const { items, total } = await listEmails(req.userId!, query);
  res.json({ items, page: query.page, limit: query.limit, total });
});
