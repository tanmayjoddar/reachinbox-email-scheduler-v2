import { Redis, type RedisOptions } from 'ioredis';
import { env } from '../config/env';

const redisOptions: RedisOptions = { maxRetriesPerRequest: null };

export const createRedis = () => new Redis(env.REDIS_URL, redisOptions);

export const redis = createRedis();
