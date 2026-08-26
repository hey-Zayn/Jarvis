import crypto from 'crypto';
import { EmbeddingProvider } from '../embeddings/embeddingProvider.js';
import { QdrantClient } from './qdrantClient.js';

export class MemoryStore {
  constructor({
    embeddingProvider = new EmbeddingProvider(),
    qdrantClient = new QdrantClient()
  } = {}) {
    this.embeddingProvider = embeddingProvider;
    this.qdrantClient = qdrantClient;
    this.qdrantClient.initialize().catch(err => {
      console.warn('[MemoryStore] Background Qdrant init notice:', err.message);
    });
  }

  /**
   * Save a memory synchronously into vector store
   */
  async save({ userId = 'anonymous-user', content, category = 'general', metadata = {} } = {}) {
    if (!content || !content.trim()) {
      throw new Error('Memory content is required');
    }

    const memoryId = `mem-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const vector = await this.embeddingProvider.generateEmbedding(content);

    const payload = {
      memoryId,
      userId,
      content,
      category,
      metadata,
      createdAt: new Date().toISOString()
    };

    // Upsert into vector database
    await this.qdrantClient.upsertPoint({
      id: crypto.randomUUID(),
      vector,
      payload
    });

    return {
      memoryId,
      content,
      category,
      status: 'saved'
    };
  }

  /**
   * Perform semantic vector search over memories
   */
  async search({ userId = 'anonymous-user', query, limit = 5, minScore = 0.05 } = {}) {
    if (!query || !query.trim()) {
      return [];
    }

    const queryVector = await this.embeddingProvider.generateEmbedding(query);
    const searchHits = await this.qdrantClient.search({
      vector: queryVector,
      limit,
      userId
    });

    return searchHits
      .filter(hit => hit.score >= minScore)
      .map(hit => ({
        memoryId: hit.payload?.memoryId || hit.id,
        content: hit.payload?.content || '',
        score: Number(hit.score.toFixed(4)),
        category: hit.payload?.category || 'general',
        metadata: hit.payload?.metadata || {},
        createdAt: hit.payload?.createdAt
      }));
  }

  /**
   * Delete memory
   */
  async delete({ memoryId }) {
    if (!memoryId) return false;
    return await this.qdrantClient.deletePoint(memoryId);
  }

  /**
   * Format relevant memories as a context snippet for LangGraph prompt injection
   */
  async getRelevantContextString({ userId, query, limit = 3 }) {
    const results = await this.search({ userId, query, limit });
    if (results.length === 0) return '';

    const lines = results.map((m, idx) => `[Fact ${idx + 1}] (${m.category}): ${m.content}`);
    return `[Retrieved User Memory Context]\n${lines.join('\n')}`;
  }
}
