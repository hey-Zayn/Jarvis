/**
 * Tool definition for web search capability
 */
export const searchTool = {
  name: 'search_web',
  description: 'Search the web for up-to-date information, news, or general knowledge queries.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query or keywords to look up'
      }
    },
    required: ['query']
  },
  async handler({ query }) {
    if (!query) {
      return { error: 'Search query is required' };
    }

    // Fast search provider stub
    // In production, connect to Tavily / SerpAPI / DuckDuckGo
    return {
      query,
      results: [
        {
          title: `Information regarding: ${query}`,
          snippet: `Top search results for "${query}" synthesized by Jarvis Agent engine.`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
        }
      ]
    };
  }
};
