# Phase 3: Voice Command Loop MVP - Detailed Plan

## Overview
This phase focuses on proving the core Jarvis loop: voice command in, streaming response out, all within the sub-200ms latency budget. We implement a transcript-first approach (if full speech-to-text is not ready) and stream the agent's response as early as possible. Non-critical tasks like conversation persistence are offloaded to BullMQ queues to avoid blocking the voice loop.

## Goals
- Achieve first agent response chunk in under 200ms in local happy-path tests with mocked model calls.
- Stream partial responses as early as possible.
- Ensure voice route remains responsive even if worker-service is stopped (async jobs failed).
- Make conversation persistence failures non-fatal to the active voice response.
- Instrument latency at key stages for monitoring and optimization.

## User Flow
1. User activates voice control in the web app or browser extension.
2. Client captures audio and converts it to a transcript (using a temporary mock or real STT if available).
3. Client sends the transcript to the gateway via a streaming HTTP or WebSocket connection.
4. Gateway validates the user's JWT and forwards the transcript to the agent-service via gRPC.
5. Agent-service creates a conversation turn, processes the transcript through the LangGraph orchestrator (or a temporary fallback), and begins streaming a text response.
6. Gateway relays the streamed response back to the client.
7. After the response stream completes, the agent-service enqueues a BullMQ job to persist the conversation and metrics (non-blocking).
## Tasks and Subtasks

### 1. Implement Streaming Edge in Gateway
   - **1.1**: Decide on transport mechanism (WebSocket vs. streaming HTTP) based on latency tests and complexity.
   - **1.2**: Update `backend/gateway` to handle incoming streaming connections for voice commands.
   - **1.3**: Add JWT validation middleware specifically for the voice command streaming endpoint.
   - **1.4**: Implement proxying of the voice command stream to the agent-service via gRPC (or HTTP if gRPC streaming proves complex).
   - **1.5**: Test the endpoint with a simple echo service to measure baseline latency.

### 2. Implement AgentService.SendVoiceCommand
   - **2.1**: Define the gRPC service method in `shared/proto/agent/v1/agent.proto`:
        ```proto
        rpc SendVoiceCommand (VoiceCommandRequest) returns (stream VoiceCommandResponse);
        ```
   - **2.2**: Implement the gRPC handler in `backend/services/agent-service`:
        - Parse the incoming transcript.
        - Create a conversation turn record in Prisma (but do not wait for write; instead, enqueue a persistence job).
        - Invoke the LangGraph orchestrator (or temporary transcript-first logic) to generate a response.
        - Stream response chunks back via gRPC.
   - **2.3**: Handle errors gracefully (e.g., LangGraph failure, timeout) and stream error messages if appropriate.

### 3. Temporary Transcript-First Path
   - **3.1**: Design a fallback that accepts raw text from the client (bypassing STT) for development and testing.
   - **3.2**: Update the client (web app/extension) to send text when in transcript-first mode.
   - **3.3**: Ensure the agent-service treats the transcript input identically to a real STT output.

### 4. Implement Response Streaming
   - **4.1**: Modify the agent-service to generate response chunks asynchronously (e.g., using async iterators or callbacks from LangGraph).
   - **4.2**: Ensure each chunk is sent promptly via gRPC streaming without batching.
   - **4.3**: Update the gateway to relay gRPC response chunks to the client over the streaming HTTP/WebSocket connection.
   - **4.4**: Test streaming with a mock LLM that returns delayed chunks to verify true streaming behavior.

### 5. Add Latency Instrumentation
   - **5.1**: Instrument the gateway to record timestamps at:
        - Request received
        - JWT validation completed
        - gRPC request sent to agent-service
        - First response chunk received from agent-service
        - Last response chunk received
        - Response sent to client
   - **5.2**: Instrument the agent-service to record:
        - gRPC request received
        - Transcript received
        - LangGraph processing started
        - First token generated
        - Each subsequent token (if feasible)
        - Response stream completed
   - **5.3**: Log these timestamps as structured logs (e.g., JSON) and compute latency deltas.
   - **5.4**: Optionally, emit metrics to a monitoring system (e.g., Prometheus via a simple counter/histogram).

### 6. Queue Conversation Persistence
   - **6.1**: Define a BullMQ job type `conversation-persist` in `backend/services/worker-service`.
   - **6.2**: In the agent-service, after the response stream ends, enqueue a job containing:
        - Conversation ID
        - User ID
        - Transcript
        - Agent response
        - Timestamps
   - **6.3**: Implement a BullMQ processor in `worker-service` that saves the conversation and messages to the database via Prisma.
   - **6.4**: Add retry logic with exponential backoff for failed persistence jobs.
   - **6.5**: Ensure that enqueuing the job does not block the response stream (use fire-and-forget).
## Acceptance Criteria
- **Primary**: First agent response chunk is emitted in under 200ms from the time the gateway receives the voice command (in local tests with mocked model calls and no network delay).
- **Responsiveness**: The voice command endpoint remains responsive (returns streaming response) even when the worker-service is stopped or down.
- **Resilience**: If the conversation persistence job fails repeatedly, the active voice response stream completes successfully and the error is logged (does not bring down the agent-service).
- **Instrumentation**: Latency metrics (request-to-first-chunk, request-to-stream-end) are visible in the service logs in a structured format.
- **Streaming**: The client receives response chunks incrementally, not as a single blob after the entire response is generated.

## Dependencies
- Completion of **Phase 2 (Auth, Users, And Security Baseline)** for JWT validation and user management.
- gRPC contract for `agent-service` defined in **Phase 1** (we are extending it with streaming).
- BullMQ and Redis setup (should be available from Phase 2 infrastructure work).
- LangGraph orchestrator scaffolded in `agent-service` (from Phase 4, but we are implementing a minimal version for Phase 3).

## Estimated Time
- **Gateway streaming edge**: 3 days
- **Agent-service SendVoiceCommand**: 4 days
- **Transcript-first path**: 1 day
- **Response streaming**: 2 days
- **Latency instrumentation**: 2 days
- **Conversation persistence queuing**: 2 days
- **Total**: Approximately 14 days (assuming parallel work where possible)

## Notes
- The API keys for Groq, Gemini, Deepgram, and AssemblyAI are already configured in `backend/services/agent-service/.env`.
- This phase uses a transcript-first approach; full STT/TTS integration is deferred to Phase 9.
- The LangGraph orchestrator in this phase will be intentionally simple (e.g., a single node that calls an LLM) to focus on the voice loop.
- All non-database work (like persistence) is queued via BullMQ to keep the voice loop lightweight.