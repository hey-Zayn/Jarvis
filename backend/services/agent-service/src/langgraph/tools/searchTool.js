/**
 * Tool definition for real web search capability (Wikipedia + DuckDuckGo Instant Answer)
 */
export const searchTool = {
  name: 'search_web',
  description: 'Search the internet and Wikipedia for accurate, up-to-date information, facts, encyclopedia entries, news, or general queries.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query, subject, or keywords to look up on the web or Wikipedia'
      }
    },
    required: ['query']
  },
  async handler({ query }) {
    if (!query || typeof query !== 'string') {
      return { error: 'Search query is required' };
    }

    const trimmedQuery = query.trim();
    const results = [];

    // Helper to strip HTML tags from Wikipedia snippets
    const cleanSnippet = (html) =>
      String(html || '')
        .replace(/<[^>]+>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&')
        .trim();

    // 1. Wikipedia Search API
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(trimmedQuery)}&format=json&origin=*&utf8=1&srlimit=3`;
      const wikiRes = await fetch(wikiUrl, {
        headers: { 'User-Agent': 'JarvisAssistant/2.0 (voice-ai-agent)' },
        signal: AbortSignal.timeout(3500)
      });
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        const searchItems = wikiData?.query?.search || [];
        for (const item of searchItems) {
          results.push({
            source: 'Wikipedia',
            title: item.title,
            snippet: cleanSnippet(item.snippet),
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`
          });
        }
      }
    } catch (err) {
      // Wikipedia fallback gracefully handled
    }

    // 2. DuckDuckGo Instant Answer API
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(trimmedQuery)}&format=json&no_html=1&skip_disambig=1`;
      const ddgRes = await fetch(ddgUrl, {
        headers: { 'User-Agent': 'JarvisAssistant/2.0 (voice-ai-agent)' },
        signal: AbortSignal.timeout(3500)
      });
      if (ddgRes.ok) {
        const ddgData = await ddgRes.json();
        if (ddgData.AbstractText) {
          results.unshift({
            source: 'DuckDuckGo Instant Answer',
            title: ddgData.Heading || trimmedQuery,
            snippet: ddgData.AbstractText,
            url: ddgData.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(trimmedQuery)}`
          });
        } else if (Array.isArray(ddgData.RelatedTopics) && ddgData.RelatedTopics.length > 0) {
          const firstTopic = ddgData.RelatedTopics[0];
          if (firstTopic && firstTopic.Text && firstTopic.FirstURL) {
            results.push({
              source: 'DuckDuckGo Related',
              title: trimmedQuery,
              snippet: firstTopic.Text,
              url: firstTopic.FirstURL
            });
          }
        }
      }
    } catch (err) {
      // DuckDuckGo fallback gracefully handled
    }

    // 3. Fallback direct web link if no direct answers returned
    if (results.length === 0) {
      results.push({
        source: 'DuckDuckGo Search',
        title: `Search results for "${trimmedQuery}"`,
        snippet: `Direct web results available on DuckDuckGo and Google for "${trimmedQuery}".`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(trimmedQuery)}`
      });
    }

    return {
      query: trimmedQuery,
      resultCount: results.length,
      results
    };
  }
};
