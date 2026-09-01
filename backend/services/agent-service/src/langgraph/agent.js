import { AgentState } from './stateSchema.js';
import { ToolRegistry } from './tools/registry.js';
import fs from 'node:fs';
import path from 'node:path';

const FALLBACK_SYSTEM_PROMPT = 'You are Jarvis, a serious, concise, accurate, and practical AI assistant. Answer the user directly, use tools when useful, avoid filler, and never invent facts.';
function loadSystemPrompt() {
  const candidates = [
    path.resolve(process.cwd(), 'prompt/prompt.md'),
    new URL('../../../../prompt/prompt.md', import.meta.url)
  ];
  for (const candidate of candidates) {
    try {
      const prompt = fs.readFileSync(candidate, 'utf8').trim();
      if (prompt) return prompt;
    } catch { /* Docker/local fallback */ }
  }
  return FALLBACK_SYSTEM_PROMPT;
}
const SYSTEM_PROMPT = loadSystemPrompt();

export class LangGraphAgent {
  constructor({ groqApiKey = process.env.GROQ_API_KEY, model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b', maxSteps = 4, timeoutMs = 12000 } = {}) {
    this.groqApiKey = groqApiKey;
    this.model = model;
    this.maxSteps = maxSteps;
    this.timeoutMs = timeoutMs;
    this.toolRegistry = new ToolRegistry();
    this.groq = null;
  }

  async _getGroqClient() {
    if (this.groq) return this.groq;
    if (!this.groqApiKey) return null;

    try {
      const { Groq } = await import('groq-sdk');
      this.groq = new Groq({ apiKey: this.groqApiKey });
      return this.groq;
    } catch (err) {
      console.warn('[LangGraphAgent] groq-sdk could not be imported:', err.message);
      return null;
    }
  }

  /**
   * Main entry point to process a voice/text command with multi-step reasoning and streaming output.
   */
  async *processCommand({ conversationId, userId, transcript, browserContext, memoryStore, history = [] }) {
    const state = new AgentState({ conversationId, userId, transcript, browserContext, history });
    const startTime = Date.now();
    let chunkIndex = 0;

    const okStatus = (msg) => ({ ok: true, message: msg });

    try {
      if (!transcript || !transcript.trim()) {
        yield {
          status: okStatus('Empty transcript'),
          conversation_id: state.conversationId,
          turn_id: `turn-${Date.now()}-${chunkIndex++}`,
          chunk: 'I did not catch that. Could you please repeat?',
          is_final: true
        };
        return;
      }

      const groq = await this._getGroqClient();

      if (!groq) {
        // Fallback when no API key configured or SDK unavailable
        yield* this._streamFallback(state, 'Running in local agent fallback mode.');
        return;
      }

      // Step 1: Tool Calling Reasoning Loop
      let stepCount = 0;
      let needsMoreExecution = true;
      const toolDefinitions = this.toolRegistry.toGroqToolDefinitions();

      while (needsMoreExecution && stepCount < this.maxSteps) {
        // Timeout guard
        if (Date.now() - startTime > this.timeoutMs) {
          state.addError(new Error('Agent reasoning timed out'));
          break;
        }

        const messages = state.getLLMMessages(SYSTEM_PROMPT);

        const response = await groq.chat.completions.create({
          model: this.model,
          messages,
          tools: toolDefinitions,
          tool_choice: 'auto',
          temperature: 0.15,
          max_tokens: 600
        });

        const choice = response.choices[0];
        const message = choice.message;

        if (message.tool_calls && message.tool_calls.length > 0) {
          state.addMessage('assistant', message.content || '', { tool_calls: message.tool_calls });
          state.addReasoningStep('thought', `Model requested ${message.tool_calls.length} tool execution(s)`);

          // Execute tool calls
          for (const toolCall of message.tool_calls) {
            const funcName = toolCall.function.name;
            let funcArgs = {};
            try {
              funcArgs = JSON.parse(toolCall.function.arguments || '{}');
            } catch (err) {
              funcArgs = {};
            }

            state.addReasoningStep('tool_call', `Calling ${funcName}`, funcName, funcArgs);

            const toolResult = await this.toolRegistry.execute(
              funcName,
              funcArgs,
              { memoryStore, userId: state.userId, conversationId: state.conversationId }
            );

            state.recordToolUsage(funcName, funcArgs, toolResult);

            state.addMessage('tool', JSON.stringify(toolResult), {
              tool_call_id: toolCall.id,
              name: funcName
            });
          }

          stepCount++;
        } else {
          needsMoreExecution = false;
        }
      }

      // Step 2: Stream Final Response
      const finalMessages = state.getLLMMessages(SYSTEM_PROMPT);

      const stream = await groq.chat.completions.create({
        model: this.model,
        messages: finalMessages,
        temperature: 0.2,
        max_tokens: 500,
        stream: true
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          yield {
            status: okStatus('Streaming voice command response'),
            conversation_id: state.conversationId,
            turn_id: `turn-${Date.now()}-${chunkIndex++}`,
            chunk: content,
            is_final: false
          };
        }
      }

      state.finalResponse = fullResponse;
      state.isComplete = true;

      // Final completion chunk
      yield {
        status: okStatus('Streaming complete'),
        conversation_id: state.conversationId,
        turn_id: `turn-${Date.now()}-${chunkIndex++}`,
        chunk: '',
        is_final: true,
        metadata: {
          stepCount: state.metadata.stepCount,
          toolUsageCount: state.metadata.toolUsageCount,
          latencyMs: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('[LangGraphAgent] Error processing command:', error);
      state.addError(error);
      yield* this._streamFallback(state, error.message);
    }
  }

  async * _streamFallback(state, errorMsg) {
    const text = errorMsg 
      ? `Jarvis is ready. (${errorMsg})`
      : `I received your command: "${state.transcript || ''}".`;

    const chunkSize = 15;
    let idx = 0;
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.substring(i, i + chunkSize);
      yield {
        status: { ok: true, message: 'Fallback response' },
        conversation_id: state.conversationId,
        turn_id: `fallback-${Date.now()}-${idx++}`,
        chunk,
        is_final: i + chunkSize >= text.length
      };
    }
  }
}
