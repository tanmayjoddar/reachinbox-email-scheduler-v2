import { env } from '../config/env';
import { redis } from '../redis/connection';
import { HOUR, hourWindow, nextHourStart } from '../utils/time';

const SCRIPT = `
local senderCount = tonumber(redis.call('GET', KEYS[2]) or '0')
if senderCount >= tonumber(ARGV[1]) then
  local k = redis.call('INCR', KEYS[4])
  redis.call('EXPIRE', KEYS[4], 10800)
  return {'limit', 'sender', k}
end
local tenantCount = tonumber(redis.call('GET', KEYS[3]) or '0')
if tenantCount >= tonumber(ARGV[2]) then
  local k = redis.call('INCR', KEYS[5])
  redis.call('EXPIRE', KEYS[5], 10800)
  return {'limit', 'batch', k}
end
if redis.call('EXISTS', KEYS[1]) == 1 then
  return {'delay', '', redis.call('PTTL', KEYS[1])}
end
redis.call('INCR', KEYS[2])
redis.call('EXPIRE', KEYS[2], 7200)
redis.call('INCR', KEYS[3])
redis.call('EXPIRE', KEYS[3], 7200)
redis.call('SET', KEYS[1], '1', 'PX', tonumber(ARGV[3]))
return {'ok', '', 0}
`;

export type ReserveResult =
  | { allowed: true }
  | { allowed: false; reason: 'delay'; retryAt: number }
  | { allowed: false; reason: 'limit'; scope: 'sender' | 'batch'; retryAt: number };

export async function reserveSlot(
  senderId: string,
  userId: string,
  hourlyLimit: number,
  batchDelayMs: number,
): Promise<ReserveResult> {
  const now = Date.now();
  const window = hourWindow(now);
  const keys = [
    `gate:${senderId}`,
    `rl:${senderId}:${window}`,
    `rlu:${userId}:${window}`,
    `overflow:s:${senderId}:${window}`,
    `overflow:u:${userId}:${window}`,
  ];

  const reply = (await redis.eval(
    SCRIPT,
    5,
    ...keys,
    env.MAX_EMAILS_PER_HOUR_PER_SENDER,
    hourlyLimit,
    env.MIN_DELAY_MS,
  )) as [string, string, number];

  const [kind, scope, value] = reply;

  if (kind === 'ok') return { allowed: true };

  if (kind === 'delay') {
    return { allowed: false, reason: 'delay', retryAt: now + value + Math.floor(Math.random() * 250) };
  }

  // Place each bounced job straight into its final slot (in arrival order) so it moves once instead of re-bouncing every hour.
  const limit = scope === 'sender' ? env.MAX_EMAILS_PER_HOUR_PER_SENDER : hourlyLimit;
  const spacing = Math.max(batchDelayMs, env.MIN_DELAY_MS);
  const k = value;
  const retryAt = nextHourStart(now) + Math.floor((k - 1) / limit) * HOUR + ((k - 1) % limit) * spacing;
  return { allowed: false, reason: 'limit', scope: scope as 'sender' | 'batch', retryAt };
}
