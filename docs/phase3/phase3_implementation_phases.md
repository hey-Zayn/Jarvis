# Phase 3: Voice Command Loop MVP - Implementation Phases

This document breaks down the Phase 3 (Voice Command Loop MVP) detailed plan into trackable implementation phases. Each phase has a clear goal, set of tasks, and acceptance criteria to monitor progress.

## Phase 3.1: Gateway Streaming Edge and Authentication

**Goal**: Establish a secure, streaming connection from the client to the gateway for voice commands, with JWT validation.

**Tasks**:
- [ ] Decide on transport mechanism (WebSocket vs. streaming HTTP) based on latency tests and complexity.
- [ ] Update `backend/gateway` to handle incoming streaming connections for voice commands at a new endpoint (e.g., `/voice/stream`).
- [ ] Add JWT validation middleware specifically for the voice command streaming endpoint (using the auth service or shared secret).
- [ ] Implement proxying of the voice command stream to the agent-service via gRPC (unary for now, to be upgraded to streaming in Phase 3.2).
- [ ] Test the endpoint with a simple echo service in agent-service to measure baseline latency and ensure the connection works end-to-end.

**Acceptance Criteria**:
- The gateway accepts streaming connections at `/voice/stream`.
- Invalid JWTs are rejected without reaching the agent-service.
- A simple echo request (unary) from the gateway to agent-service and back to the client works with measurable latency.
- Logs show successful JWT validation and request forwarding.

## Phase 3.2: Agent Service gRPC Streaming Endpoint

**Goal**: Implement the gRPC streaming endpoint in the agent-service to handle voice commands and stream responses.

**Tasks**:
- [x] Define the gRPC service method in `shared/proto/agent/v1/agent.proto`:
        ```proto
        rpc SendVoiceCommand (VoiceCommandRequest) returns (stream VoiceCommandResponse);
        ```
- [x] Implement the gRPC handler in `backend/services/agent-service`:
        - Parse the incoming transcript from the request.
        - For now, create a simple echo response (or a canned response) and split it into chunks to simulate streaming.
        - Stream the response chunks back via gRPC.
- [x] Update the gateway (from Phase 3.1) to proxy the streaming gRPC response to the client over the streaming HTTP/WebSocket connection.
- [x] Test with a non-streaming echo first, then verify streaming chunks are received incrementally by the client.

**Acceptance Criteria**:
- The agent-service exposes a gRPC server with the `SendVoiceCommand` streaming method.
- The gateway correctly proxies the client's voice command stream to the agent-service via gRPC.
- The agent-service sends back a stream of response chunks (even if just echoing) that the gateway relays to the client.
- The client receives the response in multiple chunks (not as a single blob).
## Phase 3.3: Transcript-First Path and Basic Response Generation

**Goal**: Implement a fallback that accepts raw text from the client (bypassing STT) and generates a basic AI response to test the end-to-end loop.

**Tasks**:
- [x] Design a fallback that accepts raw text from the client (bypassing STT) for development and testing. This can be a flag or a separate endpoint, but ideally the same endpoint that accepts a transcript.
- [x] Update the client (web app/extension) to send text when in transcript-first mode (for testing).
- [x] In the agent-service, replace the echo with a call to an LLM (using Groq or Gemini API keys) to generate a response based on the transcript.
- [x] Initially, generate the full response and then split it into chunks for streaming (to be improved in Phase 3.4).
- [x] Ensure the agent-service treats the transcript input identically to a real STT output (same processing pipeline).

**Acceptance Criteria**:
- [x] The client can send a text transcript (instead of audio) to the gateway.
- [x] The agent-service receives the transcript, calls the LLM API, and generates a coherent response.
- [x] The response is sent back to the client in chunks (even if the generation is not yet streaming).
- [x] The end-to-end latency is measurable and we have a baseline for optimization.

## Phase 3.4: Response Streaming Implementation

**Goal**: Modify the agent-service to generate and stream response chunks in real-time as they are produced by the LLM.

**Tasks**:
- [ ] Modify the agent-service to generate response chunks asynchronously (e.g., using async iterators or callbacks from the LLM library).
- [ ] Ensure each chunk is sent promptly via gRPC streaming without batching (or with minimal batching).
- [ ] Update the gateway to relay gRPC response chunks to the client over the streaming HTTP/WebSocket connection without delay.
- [ ] Test streaming with a mock LLM that returns delayed chunks (or use the real LLM with a delay) to verify true streaming behavior (i.e., client receives chunks as they are generated, not all at the end).
- [ ] Handle errors during streaming (e.g., LLM timeout) and stream error messages if appropriate.

**Acceptance Criteria**:
- The agent-service generates and sends response chunks as they are available from the LLM.
- The gateway relays each chunk to the client immediately upon receipt.
- The client receives response chunks incrementally, demonstrating true streaming.
- The time to first chunk is significantly reduced compared to sending the full response at once.
## Phase 3.5: Latency Instrumentation and Optimization

**Goal**: Instrument latency at key stages and optimize to meet the sub-200ms first-chunk goal.

**Tasks**:
- [ ] Instrument the gateway to record timestamps at:
        - Request received
        - JWT validation completed
        - gRPC request sent to agent-service
        - First response chunk received from agent-service
        - Last response chunk received
        - Response sent to client
- [ ] Instrument the agent-service to record:
        - gRPC request received
        - Transcript received
        - LLM call started
        - First token generated (or first chunk ready)
        - Each subsequent token (if feasible)
        - Response stream completed
- [ ] Log these timestamps as structured logs (e.g., JSON) and compute latency deltas (e.g., request-to-first-chunk, request-to-stream-end).
- [ ] Optionally, emit metrics to a simple monitoring system (e.g., in-memory counters or Prometheus via a client library).
- [ ] Analyze the latency logs to identify bottlenecks.
- [ ] Optimize based on findings (e.g., reduce batching, improve concurrency, tune LLM parameters).

**Acceptance Criteria**:
- Latency metrics are visible in the service logs in a structured format.
- The latency from gateway request receipt to first chunk sent to client is measured and logged.
- In local happy-path tests with mocked LLM calls (or fast LLM), the first agent response chunk is emitted in under 200ms from the time the gateway receives the voice command.
- If the latency is above 200ms, we have identified the bottlenecks and have a plan to address them in future phases.

## Phase 3.6: Conversation Persistence via BullMQ

**Goal**: Offload conversation persistence to BullMQ queues to avoid blocking the voice loop.

**Tasks**:
- [ ] Define a BullMQ job type `conversation-persist` in `backend/services/worker-service`.
- [ ] In the agent-service, after the response stream ends, enqueue a job containing:
        - Conversation ID
        - User ID
        - Transcript
        - Agent response
        - Timestamps (for latency and audit)
- [ ] Implement a BullMQ processor in `worker-service` that saves the conversation and messages to the database via Prisma.
- [ ] Add retry logic with exponential backoff for failed persistence jobs.
- [ ] Ensure that enqueuing the job does not block the response stream (use fire-and-forget, i.e., do not wait for the job to be enqueued before completing the stream).
- [ ] Test that the voice loop remains responsive even when the worker-service is stopped or the persistence job fails repeatedly.

**Acceptance Criteria**:
- After a voice command interaction, a `conversation-persist` job is enqueued in BullMQ.
- The worker-service processes the job and saves the conversation to the database.
- If the worker-service is down, the voice command stream completes successfully and the job is retried when the worker recovers.
- The active voice response stream is not delayed or interrupted by persistence failures.
- Logs show that persistence errors are caught and do not bring down the agent-service.

## Overall Phase 3 Acceptance Criteria (as per the detailed plan)
- [ ] First agent response chunk is emitted in under 200ms from the time the gateway receives the voice command (in local happy-path tests with mocked model calls and no network delay).
- [ ] The voice command endpoint remains responsive (returns streaming response) even when the worker-service is stopped or down.
- [ ] If the conversation persistence job fails repeatedly, the active voice response stream completes successfully and the error is logged (does not bring down the agent-service).
- [ ] Latency metrics (request-to-first-chunk, request-to-stream-end) are visible in the service logs in a structured format.
- [ ] The client receives response chunks incrementally, not as a single blob after the entire response is generated.

## Notes on Parallel Work and Dependencies
- Phases 3.1 and 3.2 can be worked on in parallel by gateway and agent-service engineers, but Phase 3.2 depends on the proto definition which should be done first.
- Phase 3.3 (transcript-first path) can be started once Phase 3.2 has a basic echo working, to test the LLM integration.
- Phase 3.4 (true streaming) depends on having a working LLM call in Phase 3.3.
- Phase 3.5 (instrumentation) can be added incrementally as each phase is completed, but a focused optimization pass is done after Phase 3.4.
- Phase 3.6 (persistence) can be started once the agent-service has a working response stream (from Phase 3.3 or 3.4) and does not block the stream.

## Estimated Time per Phase (for reference)
- Phase 3.1: 3 days
- Phase 3.2: 4 days
- Phase 3.3: 1 day
- Phase 3.4: 2 days
- Phase 3.5: 2 days
- Phase 3.6: 2 days
- **Total**: Approximately 14 days (with potential for parallel work reducing calendar time)