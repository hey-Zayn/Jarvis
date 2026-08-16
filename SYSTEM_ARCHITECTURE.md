SYSTEM_ARCHITECTURE.md — Jarvis Microservices Platform Specification
This document details the architecture, design patterns, services, API contracts, tech stacks, and low-latency performance strategies for the Jarvis Voice-Enabled AI Platform.

1. System Architecture Overview
   Jarvis employs an Event-Driven Microservices Architecture split into distinct execution, edge routing, intelligence, and asynchronous processing layers.

┌─────────────────────────┐
│ Chrome Extension │
│ (Manifest V3 Client) │
└───────────┬─────────────┘
│ WebSocket / HTTP (TLS)
▼
┌─────────────────────────┐
│ NGINX Edge │
│ (SSL & WSS Gateway) │
└───────────┬─────────────┘
│
▼
┌─────────────────────────┐
│ Express API Gateway │
│ (Stateless Socket.io) │
└───────┬─────────┬───────┘
│ │
gRPC (Protobuf / HTTP2)│ │ Async Job
│ │ Event (Redis)
┌──────────────────────────┘ └──────────────────────────┐
▼ ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│ Auth Service │ │ Agent Service │ │ BullMQ Queue │
│ (Node.js / gRPC) │ │ (LangGraph Engine) │ │ (Redis In-Memory) │
└───────────┬───────────┘ └───────────┬───────────┘ └───────────┬───────────┘
│ │ │
│ │ RAG Lookups │ Job Processing
│ ▼ ▼
│ ┌───────────────────────┐ ┌───────────────────────┐
│ │ Qdrant Vector DB │ │ Worker Service │
│ │ (Semantic Memory) │ │ (Audit & Data Sync) │
│ └───────────────────────┘ └───────────┬───────────┘
│ │
└───────────────────────────────┬───────────────────────────────┘
▼
┌───────────────────────┐
│ Neon PostgreSQL │
│ (Serverless Data) │
└───────────────────────┘

Architectural PrinciplesStateless Gateway Edge: The Gateway contains zero persistence logic. It acts purely as a real-time event router and protocol translator (WebSocket to gRPC/Redis).Zero Synchronous Blockers: Expensive persistent operations (writing execution logs, updating analytics) are offloaded asynchronously via memory-mapped event queues.Contract-First Microservice IPC: Microservices communicate internally over gRPC using HTTP/2 multiplexing, completely eliminating HTTP text-parsing overhead.2. High-Performance System Design & Optimization StrategiesTo achieve sub-200ms roundtrip latencies for real-time voice and action triggers, the system incorporates the following optimization patterns:⚡ Low-Latency Real-Time PipelineClient-Side STT/TTS Offloading: Speech-to-Text (Web Speech API) and Text-to-Speech (chrome.tts) run natively on the user's client device. The network transfers only small textual payloads (voice transcripts and JSON action blocks), preserving bandwidth and minimizing cloud processing delays.Binary gRPC IPC over HTTP/2: Internal microservices use protocol buffers (Protobuf). Binary serialization yields 60-80% smaller payloads and significantly faster encoding/decoding compared to standard JSON serialization. Connection Pooling & HTTP/2 Multiplexing: api-gateway maintains warm, long-lived gRPC channel pools to agent-service and auth-service. Multiple concurrent client calls travel over single TCP streams. 🔒 Non-Blocking Async Worker PipelineRedis In-Memory Buffering: Event processing (e.g., logging every tab command executed by the extension) does NOT touch PostgreSQL directly from the API Gateway.BullMQ Offloading: The API Gateway writes a job to an in-memory Redis Queue in <2ms, immediately returning a success frame to the user interface. The worker-service processes the queue asynchronously in background batches.Database Connection Pooling: Neon PostgreSQL connections are managed via PgBouncer pooling (DATABASE_URL) to eliminate process connection instantiation latencies.3. Technology Stack MatrixService / LayerPrimary TechnologyPurpose & UsageClient EngineManifest V3 Chrome ExtensionVoice recognition, active tab DOM interaction, and chrome.tts rendering.Edge ProxyNGINXHandles SSL termination, load balancing, and WebSocket upgrade handshakes.API GatewayNode.js, Express, Socket.ioStateless routing, WebSocket handling, gRPC client dispatching.Auth ServiceNode.js, gRPC, JWT, bcryptInternal identity, authentication, and token verification service.Agent ServiceTypeScript, LangGraph, Groq/GeminiState machine execution, tool classification, and action payload synthesis.Async WorkerNode.js, BullMQ, RedisAsynchronous job consumer for audit logging, history sync, and long tasks.Memory / VectorQdrant CloudVector database powering user context retrieval (RAG).Primary DatabaseNeon PostgreSQL + Prisma ORMServerless relational data store for users, system state, and structured logs.4. Microservices Breakdown & Internal Workflows1. api-gateway (Port 5000)Role: Entry point for external traffic. Exposes REST routes for user lifecycle events and a Socket.io WebSocket server for real-time duplex voice and event communication. Execution Flow:On WebSocket connection handshake, intercepts the client JWT.Issues a gRPC request to auth-service (VerifyToken).Rejects invalid connections before establishing socket channels.On incoming prompt events (JARVIS_COMMAND), forwards the user context to agent-service via gRPC (ProcessCommand).Pushes an audit event to BullMQ (audit-logs) and streams the action back to the extension client.2. auth-service (Port 50052)Role: Isolated authentication domain exposing gRPC endpoints for password hashing, token validation, and user creation.Integrations: Direct read access to User models via Prisma.3. agent-service (Port 50051)Role: High-speed AI orchestration engine running LangGraph.Workflow:Receives CommandRequest from api-gateway.Interrogates Qdrant for relevant vector contexts (e.g., stored user preferences or past tab memory).Executes LLM tool classification (via Groq/Gemini APIs).Formats decision output into deterministic extension actions (OPEN_TAB, CLOSE_TAB, SUMMARIZE_PAGE, SEARCH_WEB).Returns structured CommandResponse over gRPC.4. worker-service (Background Daemon)Role: Asynchronous processing consumer built on BullMQ.Task Handling: Concurrently pulls background jobs from Redis (e.g., batch-inserting action logs into PostgreSQL, performing long-running vector embeddings) without stalling real-time user-facing streams.5. Endpoints & Interface ContractsA. REST APIs (Exposed via Gateway)POST /api/auth/registerRequest: {"email": "user@domain.com", "password": "SecurePassword123"}Response (201 Created): {"userId": "uuid-v4", "token": "jwt.token.here"}POST /api/auth/loginRequest: {"email": "user@domain.com", "password": "SecurePassword123"}Response (200 OK): {"token": "jwt.token.here"}B. Real-Time WebSockets (Socket.io Gateway Channel)Client -> Gateway (JARVIS_COMMAND)JSON{
"userPrompt": "Open YouTube and search for lo-fi hip hop",
"activeTabUrl": "https://google.com"
}
Gateway -> Client (JARVIS_EXECUTE_ACTION)JSON{
"action": "OPEN_TAB",
"targetUrl": "https://www.youtube.com/results?search_query=lo-fi+hip+hop",
"spokenReply": "Searching YouTube for lo-fi hip hop."
}
C. Internal gRPC Protocols (shared/proto/)1. auth.protoProtocol Bufferssyntax = "proto3";
package auth;

service AuthService {
rpc Register (RegisterRequest) returns (AuthResponse);
rpc Login (LoginRequest) returns (AuthResponse);
rpc VerifyToken (TokenRequest) returns (TokenValidationResponse);
}

message RegisterRequest {
string email = 1;
string password = 2;
}

message LoginRequest {
string email = 1;
string password = 2;
}

message TokenRequest {
string token = 1;
}

message TokenValidationResponse {
bool isValid = 1;
string userId = 2;
}

message AuthResponse {
string token = 1;
string userId = 2;
} 2. agent.protoProtocol Bufferssyntax = "proto3";
package agent;

service AgentService {
rpc ProcessCommand (CommandRequest) returns (CommandResponse);
}

message CommandRequest {
string userId = 1;
string userPrompt = 2;
string activeTabUrl = 3;
}

message CommandResponse {
string action = 1; // e.g., "OPEN_TAB", "SUMMARIZE_PAGE"
string targetUrl = 2; // Calculated action target URL
string spokenReply = 3; // Text string meant for chrome.tts speech output
string rawContext = 4; // Optional JSON metadata payload
} 6. Shared Database Schema (Prisma / Neon PostgreSQL)Code snippetdatasource db {
provider = "postgresql"
url = env("DATABASE_URL")
directUrl = env("DIRECT_URL")
}

generator client {
provider = "prisma-client-js"
}

model User {
id String @id @default(uuid())
email String @unique
passwordHash String
name String?
logs ActionLog[]
memories UserMemory[]
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

model ActionLog {
id String @id @default(uuid())
action String
targetUrl String?
userId String
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
createdAt DateTime @default(now())

@@index([userId])
}

model UserMemory {
id String @id @default(uuid())
vectorId String @unique // Reference ID to Qdrant vector embedding
content String
userId String
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
createdAt DateTime @default(now())

@@index([userId])
} 7. Operational & Scaling ProfileHorizontal Gateway Scaling: Multiple api-gateway instances can sit behind NGINX. Cross-node client communication is synchronized using the @socket.io/redis-adapter. Stateless Agent Execution: The agent-service preserves zero local state; conversational state is maintained in-memory during single workflow chains or retrieved from Qdrant/PostgreSQL.Database Performance Rules: All Prisma execution paths use pooled, transient connections (DATABASE_URL), ensuring instant query completion without reaching PostgreSQL connection limits.
