import { Queue } from 'bullmq';
import { createRequestContext } from '../utils/requestContext.js';
import { createLatencyLogger } from '../utils/logger.js';
import { LangGraphAgent } from '../langgraph/agent.js';
import { MemoryStore } from '../memory/memoryStore.js';
import { prisma } from '../lib/prisma.js';
import { cacheKeys, invalidateConversationCache, invalidateMemoryCache, redisCache } from '../cache/redisCache.js';

const okStatus = (message) => ({ ok: true, message });

// Initialize BullMQ queues for persistence and async memory writes
let redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: parseInt(process.env.REDIS_DB) || 0
};

if (process.env.REDIS_URL) {
    try {
        const url = new URL(process.env.REDIS_URL);
        redisConnection = {
            host: url.hostname,
            port: parseInt(url.port) || (url.protocol === 'rediss:' ? 6380 : 6379),
            password: url.password || null,
            db: parseInt(url.pathname.substring(1)) || 0
        };
    } catch (error) {
        console.warn('[Agent Service] Failed to parse REDIS_URL, falling back to individual REDIS_* variables:', error.message);
    }
}

const conversationPersistQueue = new Queue('conversation-persist', {
    connection: redisConnection
});

export function createAgentService() {
    const latencyLogger = createLatencyLogger('agent-service');
    const memoryStore = new MemoryStore();
    const agent = new LangGraphAgent({
        groqApiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        maxSteps: 4,
        timeoutMs: 12000
    });

    return {
        async startConversation({ title, context }) {
            const userId = context?.userId;
            if (!userId) throw new Error('Authenticated user is required');
            const conversation = await prisma.conversation.create({
                data: { userId, title: title?.trim() || 'New conversation' }
            });
            await invalidateConversationCache(userId);
            return {
                status: okStatus('Conversation created'),
                conversationId: conversation.id
            };
        },

        async listConversations({ limit = 50, context }) {
            const userId = context?.userId;
            if (!userId) throw new Error('Authenticated user is required');
            const cacheKey = cacheKeys.conversations(userId, Math.min(Number(limit) || 50, 100));
            const cached = await redisCache.get(cacheKey);
            if (cached) return cached;
            const conversations = await prisma.conversation.findMany({
                where: { userId }, orderBy: { updatedAt: 'desc' }, take: Math.min(Number(limit) || 50, 100),
                include: { _count: { select: { messages: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 1 } }
            });
            const result = { status: okStatus('Conversations retrieved'), conversations: conversations.map((conversation) => ({
                conversationId: conversation.id, title: conversation.title || 'New conversation',
                createdAtEpochMillis: String(conversation.createdAt.getTime()), updatedAtEpochMillis: String(conversation.updatedAt.getTime()),
                messageCount: conversation._count.messages, lastMessage: conversation.messages[0]?.content || ''
            })) };
            await redisCache.set(cacheKey, result, 45);
            return result;
        },

        async getConversationMessages({ conversationId, context }) {
            const userId = context?.userId;
            if (!userId) throw new Error('Authenticated user is required');
            const cacheKey = cacheKeys.conversationMessages(userId, conversationId);
            const cached = await redisCache.get(cacheKey);
            if (cached) return cached;
            const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, userId }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
            if (!conversation) throw new Error('Conversation not found');
            const result = { status: okStatus('Conversation messages retrieved'), messages: conversation.messages.map((message) => ({ messageId: message.id, role: message.role, content: message.content, createdAtEpochMillis: String(message.createdAt.getTime()) })) };
            await redisCache.set(cacheKey, result, 180);
            return result;
        },

        async *sendVoiceCommand({ conversationId, transcript, browserContext, context }) {
            const requestReceivedTime = Date.now();
            let firstChunkTime = null;
            let chunkCount = 0;
            let fullResponseText = '';

            const reqId = context?.requestId || `req-${Date.now()}`;
            const userId = context?.userId;
            if (!userId) throw new Error('Authenticated user is required');
            const history = conversationId ? await (async () => {
                const cacheKey = cacheKeys.conversationMessages(userId, conversationId);
                const cached = await redisCache.get(cacheKey);
                if (cached?.messages) return cached.messages.slice(-30).map(({ role, content }) => ({ role, content }));
                const messages = await prisma.message.findMany({ where: { conversationId, conversation: { userId } }, orderBy: { createdAt: 'asc' }, select: { id: true, role: true, content: true, createdAt: true } });
                const result = { status: okStatus('Conversation messages retrieved'), messages: messages.map((message) => ({ messageId: message.id, role: message.role, content: message.content, createdAtEpochMillis: String(message.createdAt.getTime()) })) };
                await redisCache.set(cacheKey, result, 180);
                return result.messages.slice(-30).map(({ role, content }) => ({ role, content }));
            })() : [];

            latencyLogger.log('voice_command_request_received', {
                requestId: reqId,
                conversationId: conversationId || '',
                hasTranscript: !!transcript
            });

            let userLocation = null;
            try {
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { lastLatitude: true, lastLongitude: true, lastLocationLabel: true }
                });
                if (user && (user.lastLatitude != null || user.lastLocationLabel)) {
                    userLocation = {
                        latitude: user.lastLatitude,
                        longitude: user.lastLongitude,
                        label: user.lastLocationLabel || ''
                    };
                }
            } catch (err) {
                // Non-blocking location retrieval
            }

            try {
                const stream = agent.processCommand({
                    conversationId,
                    userId,
                    transcript,
                    browserContext,
                    userLocation,
                    memoryStore,
                    history
                });

                for await (const chunk of stream) {
                    if (firstChunkTime === null && chunk.chunk) {
                        firstChunkTime = Date.now();
                        latencyLogger.log('voice_command_first_chunk_generated', {
                            requestId: reqId,
                            conversationId: conversationId || '',
                            latency: firstChunkTime - requestReceivedTime
                        });
                    }

                    if (chunk.chunk) {
                        chunkCount++;
                        fullResponseText += chunk.chunk;
                    }

                    yield chunk;
                }

                const responseEndTime = Date.now();
                latencyLogger.log('voice_command_response_completed', {
                    requestId: reqId,
                    conversationId: conversationId || '',
                    latency: responseEndTime - requestReceivedTime,
                    totalChunks: chunkCount,
                    timeToFirstChunk: firstChunkTime ? firstChunkTime - requestReceivedTime : null
                });

                // Enqueue conversation persistence job asynchronously (fire-and-forget)
                conversationPersistQueue.add('conversation-persist', {
                    conversationId,
                    turnId: `turn-${Date.now()}`,
                    transcript,
                    agentResponse: fullResponseText,
                    userId,
                    timestamp: requestReceivedTime
                }).catch((error) => {
                    console.error('[Agent Service] Failed to enqueue conversation persistence job:', error);
                });

            } catch (error) {
                const errorTime = Date.now();
                latencyLogger.log('voice_command_error', {
                    requestId: reqId,
                    conversationId: conversationId || '',
                    error: error.message,
                    latency: errorTime - requestReceivedTime
                });

                console.error('[Agent Service] Error processing voice command:', error);
                yield {
                    status: okStatus('Error handled with fallback'),
                    conversation_id: conversationId || `conv-${Date.now()}`,
                    turn_id: `err-turn-${Date.now()}`,
                    chunk: `I encountered an issue processing your request: "${transcript || 'query'}". Please try again.`,
                    is_final: true
                };
            }
        },

        streamAgentResponse({ conversationId, turnId }) {
            return [
                { status: okStatus('StreamAgentResponse contract is wired'), conversationId, turnId, chunk: 'Agent ', isFinal: false },
                { status: okStatus('StreamAgentResponse contract is wired'), conversationId, turnId, chunk: 'streaming response complete.', isFinal: true }
            ];
        },

        async saveMemory({ content, metadata, context }) {
            const userId = context?.userId || 'anonymous-user';
            try {
                const result = await memoryStore.save({
                    userId,
                    content,
                    category: metadata?.category || 'general',
                    metadata: metadata || {}
                });
                await invalidateMemoryCache(userId);

                return {
                    status: okStatus('Memory saved successfully'),
                    memoryId: result.memoryId
                };
            } catch (err) {
                console.error('[Agent Service] SaveMemory error:', err);
                return {
                    status: { ok: false, message: `Failed to save memory: ${err.message}` },
                    memoryId: ''
                };
            }
        },

        async searchMemory({ query, limit, context }) {
            const userId = context?.userId || 'anonymous-user';
            const cacheKey = cacheKeys.memorySearch(userId, query || '', limit || 5);
            const cached = query ? await redisCache.get(cacheKey) : null;
            if (cached) return cached;
            try {
                const hits = await memoryStore.search({
                    userId,
                    query,
                    limit: limit || 5
                });

                const result = {
                    status: okStatus(`Found ${hits.length} relevant memories`),
                    results: hits.map(h => ({
                        memoryId: h.memoryId,
                        content: h.content,
                        score: h.score,
                        metadata: {
                            category: h.category,
                            ...(h.metadata || {})
                        }
                    }))
                };
                if (query) await redisCache.set(cacheKey, result, 120);
                return result;
            } catch (err) {
                console.error('[Agent Service] SearchMemory error:', err);
                return {
                    status: { ok: false, message: `Failed to search memory: ${err.message}` },
                    results: []
                };
            }
        }
        ,
        async listMemories({ category, limit, context }) {
            const userId = context?.userId;
            if (!userId) throw new Error('Authenticated user is required');
            const normalizedCategory = category || 'all';
            const normalizedLimit = Math.min(Number(limit) || 100, 100);
            const cacheKey = cacheKeys.memories(userId, normalizedCategory, normalizedLimit);
            const cached = await redisCache.get(cacheKey);
            if (cached) return cached;
            const memories = await prisma.memory.findMany({
                where: { userId, ...(normalizedCategory !== 'all' ? { category: normalizedCategory } : {}) },
                orderBy: { createdAt: 'desc' }, take: normalizedLimit
            });
            const result = { status: okStatus('Memories retrieved'), memories: memories.map((memory) => ({ memoryId: memory.id, content: memory.content, category: memory.category, createdAtEpochMillis: String(memory.createdAt.getTime()) })) };
            await redisCache.set(cacheKey, result, 60);
            return result;
        },
        async deleteMemory({ memoryId, context }) {
            const userId = context?.userId;
            if (!userId) throw new Error('Authenticated user is required');
            const deleted = await memoryStore.delete({ memoryId, userId });
            if (deleted) await invalidateMemoryCache(userId);
            return { status: okStatus(deleted ? 'Memory deleted' : 'Memory not found'), deleted };
        }
    };
}
