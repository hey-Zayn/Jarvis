import crypto from 'node:crypto';
import Redis from 'ioredis';

const CACHE_VERSION = 'v1';
const DEFAULT_TTL_SECONDS = 60;
let redis;

function getRedis() {
  if (redis) return redis;
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: () => null
  });
  redis.on('error', (error) => console.warn('[RedisCache] Redis unavailable:', error.message));
  return redis;
}

async function withRedis(operation, fallback) {
  try {
    const client = getRedis();
    if (client.status === 'wait') await client.connect();
    return await operation(client);
  } catch (error) {
    console.warn('[RedisCache] Cache operation skipped:', error.message);
    return fallback;
  }
}

export const cacheKeys = {
  conversations: (userId, limit) => `jarvis:${CACHE_VERSION}:user:${userId}:conversations:${limit}`,
  conversationMessages: (userId, conversationId) => `jarvis:${CACHE_VERSION}:user:${userId}:conversation:${conversationId}:messages`,
  memories: (userId, category, limit) => `jarvis:${CACHE_VERSION}:user:${userId}:memories:${category}:${limit}`,
  memorySearch: (userId, query, limit) => {
    const digest = crypto.createHash('sha256').update(query.trim().toLowerCase()).digest('hex');
    return `jarvis:${CACHE_VERSION}:user:${userId}:memory-search:${digest}:${limit}`;
  }
};

export const redisCache = {
  async get(key) {
    const value = await withRedis((client) => client.get(key), null);
    if (value === null) return null;
    try { return JSON.parse(value); } catch { return null; }
  },
  async set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
    return withRedis((client) => client.set(key, JSON.stringify(value), 'EX', ttlSeconds), null);
  },
  async del(...keys) {
    const filtered = keys.filter(Boolean);
    if (!filtered.length) return 0;
    return withRedis((client) => client.del(...filtered), 0);
  },
  async delPattern(pattern) {
    return withRedis(async (client) => {
      let cursor = '0';
      let deleted = 0;
      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length) deleted += await client.del(...keys);
      } while (cursor !== '0');
      return deleted;
    }, 0);
  }
};

export async function invalidateConversationCache(userId, conversationId) {
  await redisCache.delPattern(`jarvis:${CACHE_VERSION}:user:${userId}:conversations:*`);
  if (conversationId) await redisCache.del(cacheKeys.conversationMessages(userId, conversationId));
}

export async function invalidateMemoryCache(userId) {
  await redisCache.delPattern(`jarvis:${CACHE_VERSION}:user:${userId}:memories:*`);
  await redisCache.delPattern(`jarvis:${CACHE_VERSION}:user:${userId}:memory-search:*`);
}
