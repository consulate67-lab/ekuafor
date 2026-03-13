import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.warn('[Redis] REDIS_URL not found in environment variables. Caching will be disabled.');
}

const redis = redisUrl 
    ? new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        }
    })
    : null;

if (redis) {
    redis.on('connect', () => console.log('[Redis] Connected successfully'));
    redis.on('error', (err) => console.error('[Redis] Error:', err));
}

export default redis;
