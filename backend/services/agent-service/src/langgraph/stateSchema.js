/**
 * Agent State Schema
 * Represents the complete state of the agent during reasoning and tool usage in Jarvis.
 */
export class AgentState {
  constructor({ conversationId, userId, transcript, browserContext, userLocation, history = [] } = {}) {
    this.conversationId = conversationId || `conv-${Date.now()}`;
    this.userId = userId || 'anonymous';
    this.transcript = transcript || '';
    this.browserContext = browserContext || {};
    this.userLocation = userLocation || null;

    // Messages history formatted for LLM
    this.messages = [];

    // Reasoning steps & tool execution trace
    this.reasoningSteps = [];

    // Pending tool calls from model
    this.pendingToolCalls = [];

    // Final response stream tracker
    this.finalResponse = '';
    this.isComplete = false;

    // Metadata for tracking latency, step limits, and errors
    this.metadata = {
      startTime: Date.now(),
      stepCount: 0,
      toolUsageCount: 0,
      errors: []
    };

    for (const message of history) {
      if (message.role === 'user' || message.role === 'assistant') {
        this.addMessage(message.role, message.content);
      }
    }

    if (this.transcript) {
      this.addMessage('user', this.transcript);
    }
  }

  addMessage(role, content, extra = {}) {
    this.messages.push({
      role,
      content,
      timestamp: Date.now(),
      ...extra
    });
  }

  addReasoningStep(stepType, content, toolName = null, result = null) {
    const step = {
      stepNumber: this.reasoningSteps.length + 1,
      stepType, // 'thought' | 'tool_call' | 'tool_result' | 'observation' | 'response'
      content,
      toolName,
      result,
      timestamp: Date.now()
    };
    this.reasoningSteps.push(step);
    this.metadata.stepCount++;
    return step;
  }

  recordToolUsage(toolName, args, result) {
    this.metadata.toolUsageCount++;
    this.addReasoningStep('tool_result', `Executed ${toolName}`, toolName, result);
  }

  addError(error) {
    this.metadata.errors.push({
      message: error.message || String(error),
      timestamp: Date.now()
    });
  }

  getLLMMessages(systemPrompt) {
    const msgs = [];
    if (systemPrompt) {
      msgs.push({ role: 'system', content: systemPrompt });
    }

    // Include browser context if available and relevant
    if (this.browserContext && (this.browserContext.url || this.browserContext.pageText || this.browserContext.selectedText)) {
      let ctxText = `[Current Browser Tab Context]`;
      if (this.browserContext.title) ctxText += `\nTitle: ${this.browserContext.title}`;
      if (this.browserContext.url) ctxText += `\nURL: ${this.browserContext.url}`;
      if (this.browserContext.selectedText) ctxText += `\nSelected text: "${this.browserContext.selectedText}"`;
      if (this.browserContext.pageText) ctxText += `\nPage snippet: ${this.browserContext.pageText.substring(0, 800)}`;
      
      msgs.push({ role: 'system', content: ctxText });
    }

    // Include user geolocation context if available
    if (this.userLocation && (this.userLocation.label || (this.userLocation.latitude !== undefined && this.userLocation.longitude !== undefined))) {
      let locText = `[User Geolocation Context]`;
      if (this.userLocation.label) locText += `\nLocation: ${this.userLocation.label}`;
      if (this.userLocation.latitude !== undefined && this.userLocation.longitude !== undefined) {
        locText += `\nCoordinates: ${this.userLocation.latitude}, ${this.userLocation.longitude}`;
      }
      locText += `\nNote: Ground nearby searches, navigation, weather, and localized recommendations using this location.`;
      msgs.push({ role: 'system', content: locText });
    }

    for (const msg of this.messages) {
      msgs.push({
        role: msg.role,
        content: msg.content,
        ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}),
        ...(msg.tool_call_id ? { tool_call_id: msg.tool_call_id } : {})
      });
    }

    return msgs;
  }
}
