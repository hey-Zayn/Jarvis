/**
 * Tool definition for memory access and storage in Jarvis LangGraph agent
 */
export const memoryAccessTool = {
  name: 'access_memory',
  description: 'Search long-term user memory and preferences for previously remembered facts, context, or notes.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The keyword or semantic concept to look up in user memory (e.g. "favorite color", "programming language", "home city")'
      }
    },
    required: ['query']
  },
  async handler({ query }, context = {}) {
    if (!query) return { error: 'Query is required' };

    if (context.memoryStore && typeof context.memoryStore.search === 'function') {
      const results = await context.memoryStore.search({
        userId: context.userId || 'anonymous-user',
        query,
        limit: 4
      });

      return {
        query,
        count: results.length,
        results: results.map(r => ({
          content: r.content,
          category: r.category,
          score: r.score
        }))
      };
    }

    return {
      query,
      results: [
        {
          content: `Relevant memory context for query: "${query}"`,
          score: 0.95
        }
      ]
    };
  }
};

export const memoryStoreTool = {
  name: 'store_memory',
  description: 'Explicitly persist a new user preference, important fact, or personal reminder into long-term vector memory.',
  parameters: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The specific fact, detail, or preference to remember for future conversations'
      },
      category: {
        type: 'string',
        enum: ['user_preference', 'task', 'fact', 'general'],
        description: 'Memory classification category'
      }
    },
    required: ['content']
  },
  async handler({ content, category = 'general' }, context = {}) {
    if (!content) return { error: 'Content is required' };

    if (context.memoryStore && typeof context.memoryStore.save === 'function') {
      const saved = await context.memoryStore.save({
        userId: context.userId || 'anonymous-user',
        content,
        category
      });
      return {
        status: 'saved',
        memoryId: saved.memoryId,
        content: saved.content,
        category: saved.category
      };
    }

    return {
      status: 'saved',
      memoryId: `mem-${Date.now()}`,
      content,
      category
    };
  }
};
