import Redis from 'ioredis';

const CACHE_VERSION = 'v1';
let redis;

function getRedis() {
  if (redis) return redis;
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false, retryStrategy: () => null });
  redis.on('error', (error) => console.warn('[RedisCache] Redis unavailable:', error.message));
  return redis;
}

export async function invalidateConversationCache(userId, conversationId) {
  try {
    const client = getRedis();
    if (client.status === 'wait') await client.connect();
    let cursor = '0';
    const pattern = `jarvis:${CACHE_VERSION}:user:${userId}:conversations:*`;
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length) await client.del(...keys);
    } while (cursor !== '0');
    await client.del(`jarvis:${CACHE_VERSION}:user:${userId}:conversation:${conversationId}:messages`);
  } catch (error) { console.warn('[RedisCache] Conversation invalidation skipped:', error.message); }
}
