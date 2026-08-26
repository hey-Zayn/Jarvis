import { EmbeddingProvider } from '../src/embeddings/embeddingProvider.js';
import { QdrantClient } from '../src/memory/qdrantClient.js';
import { MemoryStore } from '../src/memory/memoryStore.js';
import { LangGraphAgent } from '../src/langgraph/agent.js';

async function runMemoryTests() {
  console.log('=== Starting Phase 5 Memory & RAG Tests ===\n');

  // Test 1: Embedding Provider
  console.log('1. Testing EmbeddingProvider:');
  const embeddingProvider = new EmbeddingProvider({ dimension: 384 });
  const vec1 = await embeddingProvider.generateEmbedding('I love writing Rust and building microservices');
  const vec2 = await embeddingProvider.generateEmbedding('Rust programming language and distributed systems');
  const vec3 = await embeddingProvider.generateEmbedding('Cooking pasta with tomato sauce');

  const sim12 = embeddingProvider.cosineSimilarity(vec1, vec2);
  const sim13 = embeddingProvider.cosineSimilarity(vec1, vec3);

  console.log(`  Vector dimension: ${vec1.length}`);
  console.log(`  Similarity(Rust vs Distributed Rust): ${(sim12 * 100).toFixed(1)}%`);
  console.log(`  Similarity(Rust vs Cooking Pasta): ${(sim13 * 100).toFixed(1)}%`);

  if (vec1.length !== 384) throw new Error('Vector length mismatch');
  if (sim12 <= sim13) throw new Error('Semantic similarity failed: Rust text should be closer to Distributed Rust than Pasta');
  console.log('  -> EmbeddingProvider tests passed!\n');

  // Test 2: Qdrant Client & Vector Search
  console.log('2. Testing QdrantClient Vector Search:');
  const qdrantClient = new QdrantClient();
  await qdrantClient.initialize();

  const testId = 'point-test-1';
  await qdrantClient.upsertPoint({
    id: testId,
    vector: vec1,
    payload: { userId: 'user-456', content: 'Prefers dark mode and Rust' }
  });

  const hits = await qdrantClient.search({ vector: vec2, limit: 2, userId: 'user-456' });
  console.log(`  Found ${hits.length} vector search hits. Top match score: ${hits[0]?.score?.toFixed(3)}`);
  if (hits.length === 0) throw new Error('QdrantClient search returned no results');
  console.log('  -> QdrantClient tests passed!\n');

  // Test 3: High-Level MemoryStore Operations
  console.log('3. Testing MemoryStore:');
  const memoryStore = new MemoryStore({ embeddingProvider, qdrantClient });

  const saved1 = await memoryStore.save({
    userId: 'user-456',
    content: 'User lives in Seattle and works on artificial intelligence',
    category: 'fact'
  });
  console.log(`  Saved memory ID: ${saved1.memoryId}`);

  const saved2 = await memoryStore.save({
    userId: 'user-456',
    content: 'User prefers concise voice responses under 200ms',
    category: 'user_preference'
  });
  console.log(`  Saved preference memory ID: ${saved2.memoryId}`);

  const searchResults = await memoryStore.search({
    userId: 'user-456',
    query: 'Where does the user live?',
    limit: 2
  });

  console.log(`  Semantic query "Where does the user live?": found "${searchResults[0]?.content}" (Score: ${searchResults[0]?.score})`);
  if (!searchResults[0]?.content.includes('Seattle')) {
    throw new Error('MemoryStore failed to retrieve the relevant Seattle memory');
  }

  const contextStr = await memoryStore.getRelevantContextString({
    userId: 'user-456',
    query: 'What are user preferences for voice answers?'
  });
  console.log(`  Generated Context Snippet:\n  ${contextStr.replace(/\n/g, '\n  ')}`);
  console.log('  -> MemoryStore tests passed!\n');

  // Test 4: LangGraph Agent with MemoryStore Context
  console.log('4. Testing LangGraph Agent Memory Tool Calling:');
  const agent = new LangGraphAgent({ groqApiKey: process.env.GROQ_API_KEY });
  
  let chunksReceived = 0;
  let hasResponse = false;

  for await (const chunk of agent.processCommand({
    conversationId: 'conv-mem-test',
    userId: 'user-456',
    transcript: 'Where do I live and what is my preferred programming language?',
    memoryStore
  })) {
    if (chunk.chunk) {
      chunksReceived++;
      hasResponse = true;
    }
  }

  console.log(`  Agent streamed ${chunksReceived} chunks successfully.`);
  if (!hasResponse) throw new Error('Agent failed to stream response with memory');
  console.log('  -> Agent + Memory integration test passed!\n');

  console.log('=== ALL PHASE 5 MEMORY & RAG TESTS PASSED! ===');
}

runMemoryTests().catch(err => {
  console.error('Memory test failed:', err);
  process.exit(1);
});
