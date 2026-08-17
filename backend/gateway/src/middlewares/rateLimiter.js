import Redis from 'ioredis';

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 100;

function getRedisClient() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    return new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 50, 2000),
        lazyConnect: true
    });
}

export function createRateLimiter({ windowMs = DEFAULT_WINDOW_MS, maxRequests = DEFAULT_MAX_REQUESTS, redis: redisClient } = {}) {
    const redis = redisClient || getRedisClient();
    const windowSec = Math.ceil(windowMs / 1000);

    return async function rateLimiter(req, res, next) {
        const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const key = `ratelimit:${ip}`;

        try {
            if (redis.status === 'wait') {
                await redis.connect();
            }

            const current = await redis.incr(key);
            if (current === 1) {
                await redis.expire(key, windowSec);
            }

            const ttl = await redis.ttl(key);
            const remaining = Math.max(0, maxRequests - current);
            const resetTime = new Date(Date.now() + ttl * 1000).toISOString();

            res.setHeader('X-RateLimit-Limit', maxRequests);
            res.setHeader('X-RateLimit-Remaining', remaining);
            res.setHeader('X-RateLimit-Reset', resetTime);

            if (current > maxRequests) {
                return res.status(429).json({
                    status: {
                        ok: false,
                        message: 'Too many requests',
                        error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded. Please slow down.' }
                    }
                });
            }

            next();
        } catch (error) {
            console.error('[RateLimiter] Redis error:', error.message);
            // Fail open - allow request through if Redis is unavailable
            next();
        }
    };
}

export function createStrictRateLimiter({ windowMs = 60 * 1000, maxRequests = 10, redis } = {}) {
    return createRateLimiter({ windowMs, maxRequests, redis });
}