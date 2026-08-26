import { ToolRegistry } from '../src/langgraph/tools/registry.js';
import { AgentState } from '../src/langgraph/stateSchema.js';
import { LangGraphAgent } from '../src/langgraph/agent.js';

async function runTests() {
  console.log('=== Starting Phase 4 Agent & Tool Tests ===\n');

  // Test 1: Tool Registry & Tool Execution
  console.log('1. Testing ToolRegistry and Individual Tools:');
  const registry = new ToolRegistry();

  // Test 1a: Calculator Tool
  const calcResult = await registry.execute('calculate', { expression: '45 * 18 + 120' });
  console.log('  [calculate]: 45 * 18 + 120 =', calcResult.result);
  if (calcResult.result !== 930) throw new Error(`Calculator test failed: expected 930, got ${calcResult.result}`);

  // Test 1b: Time Tool
  const timeResult = await registry.execute('get_current_time', { timezone: 'UTC' });
  console.log('  [get_current_time]:', timeResult.formatted);
  if (!timeResult.formatted) throw new Error('Time tool failed to return formatted time');

  // Test 1c: Weather Tool
  const weatherResult = await registry.execute('get_weather', { location: 'Tokyo' });
  console.log('  [get_weather]:', weatherResult.location, weatherResult.temperature, weatherResult.unit);
  if (!weatherResult.temperature) throw new Error('Weather tool failed');

  // Test 1d: Groq tool schema format
  const groqSchemas = registry.toGroqToolDefinitions();
  console.log(`  [schema conversion]: Registered ${groqSchemas.length} tools for Groq function calling`);
  if (groqSchemas.length < 5) throw new Error('Expected at least 5 registered tools');

  console.log('  -> Tool tests passed successfully!\n');

  // Test 2: Agent State Schema
  console.log('2. Testing AgentState:');
  const state = new AgentState({
    conversationId: 'test-conv-1',
    userId: 'user-123',
    transcript: 'What is 15 * 3?',
    browserContext: { url: 'https://example.com', title: 'Example Page' }
  });

  state.addReasoningStep('thought', 'Need calculation');
  state.recordToolUsage('calculate', { expression: '15 * 3' }, { result: 45 });
  const messages = state.getLLMMessages('System prompt');
  console.log(`  [AgentState]: Created ${messages.length} LLM messages and ${state.reasoningSteps.length} reasoning steps`);
  if (messages.length < 2) throw new Error('State messages count incorrect');
  console.log('  -> State schema test passed!\n');

  // Test 3: LangGraph Agent Local & Fallback execution
  console.log('3. Testing LangGraphAgent Execution:');
  const agent = new LangGraphAgent({ groqApiKey: process.env.GROQ_API_KEY });
  
  let chunksReceived = 0;
  let finalReceived = false;
  let fullText = '';

  for await (const chunk of agent.processCommand({
    conversationId: 'test-conv-2',
    userId: 'user-123',
    transcript: 'Hello Jarvis, this is a test'
  })) {
    if (chunk.chunk) {
      chunksReceived++;
      fullText += chunk.chunk;
    }
    if (chunk.is_final) {
      finalReceived = true;
    }
  }

  console.log(`  [Agent Stream]: Received ${chunksReceived} chunks. Final: ${finalReceived}`);
  console.log(`  [Agent Output Preview]: "${fullText.substring(0, 80)}..."`);
  if (!finalReceived) throw new Error('Agent failed to emit final chunk');
  console.log('  -> Agent execution test passed!\n');

  console.log('=== ALL PHASE 4 TESTS PASSED! ===');
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
