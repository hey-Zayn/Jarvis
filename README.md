# 🎙️ JARVIS — The Voice-First AI Agent Platform

[![Platform](https://img.shields.io/badge/Platform-JARVIS-blueviolet.svg)](https://github.com)
[![Architecture](https://img.shields.io/badge/Architecture-gRPC%20%7C%20Microservices%20%7C%20Event--Driven-purple.svg)](https://github.com)
[![Voice Loop](https://img.shields.io/badge/Voice%20Loop-Sub--200ms%20Latency-brightgreen.svg)](https://github.com)
[![AI Engine](https://img.shields.io/badge/AI%20Engine-Groq%20LLM%20%7C%20LangGraph-orange.svg)](https://groq.com)
[![Vector DB](https://img.shields.io/badge/Vector%20Memory-Qdrant%20RAG-red.svg)](https://qdrant.tech)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Prisma%207-blue.svg)](https://www.prisma.io/)
[![Queue](https://img.shields.io/badge/Async%20Queue-Redis%20%2B%20BullMQ-red.svg)](https://bullmq.io/)
[![Frontend](https://img.shields.io/badge/Clients-React%20%2B%20Vite%20%7C%20Chrome%20Extension%20MV3-black.svg)](https://vitejs.dev)

**JARVIS** is an ultra-low-latency, voice-first artificial intelligence assistant platform engineered for real-time natural speech interaction, semantic memory retrieval (RAG), asynchronous background task execution, and seamless browser context extraction.

Built on an enterprise microservices architecture with binary gRPC inter-process communication, Groq-accelerated LLM reasoning, LangGraph state machines, Qdrant vector memory, and BullMQ worker queues, JARVIS delivers responses in under 200 milliseconds while executing heavy workloads asynchronously in the background.

---

## 📑 Table of Contents

1. [Architectural Overview](#-architectural-overview)
2. [Core Platform Capabilities](#-core-platform-capabilities)
3. [System Topology & Data Flow](#-system-topology--data-flow)
4. [Microservices & Components Breakdown](#-microservices--components-breakdown)
5. [AI, Memory & Voice Engine](#-ai-memory--voice-engine)
6. [Clients & User Interfaces](#-clients--user-interfaces)
7. [Public HTTP API Reference](#-public-http-api-reference)
8. [Internal gRPC Service Contracts](#-internal-grpc-service-contracts)
9. [Database & Data Models](#-database--data-models)
10. [Port Reference & Network Topology](#-port-reference--network-topology)
11. [Getting Started & Local Development](#-getting-started--local-development)
12. [Environment Variables Matrix](#-environment-variables-matrix)

---

## 🏗️ Architectural Overview

JARVIS uses a decoupled microservices design where client interfaces communicate through an API Gateway, and backend services communicate internally over **typed binary gRPC**:

- **Edge Proxy & Public Gateway**: Express 5 HTTP gateway behind an optional Nginx reverse proxy. It performs rate limiting, authenticates bearer tokens via AuthService, attaches a trusted `RequestContext`, and proxies requests.
- **Binary Inter-Service IPC (gRPC)**: All internal communication between Gateway, AuthService, AgentService, and WorkerService is governed by versioned Protocol Buffer definitions in `shared/proto/` with zero JSON serialization overhead.
- **Fast Voice Loop (Streaming NDJSON)**: AI responses are generated via Groq SDK, streamed through gRPC back to the gateway, and flushed to the client as newline-delimited JSON (`application/x-ndjson`) chunks.
- **Vector Memory (RAG with Qdrant)**: User memories and facts are encoded into 384-dimensional embeddings and indexed in Qdrant for semantic search and retrieval during multi-turn conversations.
- **Decoupled Asynchronous Tasks (BullMQ + Redis)**: Conversation message persistence, database indexing, and external logging are offloaded to BullMQ worker queues, preventing database write latency from blocking the voice loop.
- **Relational Source of Truth**: PostgreSQL managed via Prisma 7 schema (`database/prisma/schema.prisma`) for users, sessions, conversations, messages, and persistent memory records.

---

## ⚡ Core Platform Capabilities

- **Sub-200ms Voice Agent Loop**:
  Engineered for minimal latency. Synthesized text chunks stream immediately upon token generation using Groq LLM inference, ensuring immediate audio playback via Web Speech synthesis.
- **LangGraph Agent State Machines**:
  Complex multi-step decision loops, structured tool execution, and context-aware reasoning managed by LangGraph state machines.
- **Semantic Vector Memory (RAG)**:
  Retains user preferences, personal facts, and long-term context across sessions. Searches Qdrant vectors with cosine similarity thresholds and serves frequently accessed memories from a Redis read-through cache.
- **Non-Blocking Background Persistence**:
  When a voice command completes, the conversation turn is dispatched to a BullMQ queue. Worker services handle the relational persistence into PostgreSQL transactionally without degrading stream latency.
- **Manifest V3 Chrome Browser Extension**:
  Equipped with active-tab DOM content extraction, page summarization, hands-free voice commands, and secure credential storage via `chrome.storage.local`.
- **Zero-Trust Identity Context Propagation**:
  The API Gateway verifies JWTs with AuthService and injects an authenticated `RequestContext` (User ID, Request ID, Source, Timestamp) into every internal gRPC call, preventing horizontal privilege escalation.

---

## 🔄 System Topology & Data Flow

```
                            ┌────────────────────────────────────────────────────────┐
                            │                    JARVIS Platform                     │
                            │                                                        │
   React Web Client         │   ┌────────────────────────────────────────────────┐   │
   / Chrome Extension (MV3) │   │               Nginx Edge Proxy                 │   │
           │                │   │         (Port 8000 -> Internal 80)             │   │
           │ HTTP JSON      │   └───────────────────────┬────────────────────────┘   │
           │ & NDJSON Stream│                           │                            │
           ▼                │                           ▼                            │
   ┌────────────────┐       │   ┌────────────────────────────────────────────────┐   │
   │  Clients & UI  │───────┼──►│             API Gateway (:5000)                │   │
   │  (Web & MV3)   │       │   │    (CORS, Rate Limiting, Token Verification)   │   │
   └────────────────┘       │   └───────┬───────────────┬───────────────┬────────┘   │
                            │           │               │               │            │
                            │      gRPC │          gRPC │          gRPC │            │
                            │           ▼               ▼               ▼            │
                            │   ┌──────────────┐┌──────────────┐┌──────────────┐     │
                            │   │ Auth Service ││ Agent Service││Worker Service│     │
                            │   │    (:4001)   ││    (:4002)   ││    (:4003)   │     │
                            │   └───┬──────────┘└───┬───────┬──┘└───┬──────────┘     │
                            │       │               │       │       │                │
                            │       │   Prisma ORM  │       │       │ BullMQ         │
                            │       ▼               ▼       │       ▼                │
                            │   ┌──────────────────────┐    │   ┌──────────────┐     │
                            │   │  PostgreSQL (Prisma) │    │   │ Redis (Queue │     │
                            │   │   Users, Sessions,   │    │   │  & Caching)  │     │
                            │   │  Messages, Memories  │    │   └──────┬───────┘     │
                            │   └──────────────────────┘    │          │             │
                            │                               │          ▼             │
                            │     Embedding / RAG Search    │      BullMQ Job        │
                            │     ┌─────────────────────────┴┐     Processor         │
                            │     ▼                          ▼         │             │
                            │   ┌──────────────────┐    ┌───────────┐  │             │
                            │   │ Qdrant Vector DB │    │ Groq LLM  │  │             │
                            │   │(Semantic Memory) │    │ Inference │  │             │
                            │   └──────────────────┘    └───────────┘  │             │
                            │                                          │             │
                            │         Async Message & Turn Writes      ▼             │
                            │         └──────────────────────────────────────────────┘
                            └────────────────────────────────────────────────────────┘
```

---

## 🧩 Microservices & Components Breakdown

### 1. API Gateway (`backend/gateway`)
- **Port**: `5000` (Public API) | **Nginx**: `8000`
- **Stack**: Express 5, `@grpc/grpc-js`, `@grpc/proto-loader`, Redis (`ioredis`), CORS
- **Responsibilities**:
  - Exposes public HTTP endpoints and `/api/*` aliases.
  - Authenticates incoming Bearer JWT tokens by invoking AuthService over gRPC.
  - Constructs and injects typed `RequestContext` into downstream gRPC requests.
  - Flushes streaming voice tokens to clients using chunked NDJSON (`application/x-ndjson`).
  - Redis-backed sliding window rate limiting.

### 2. Auth Service (`backend/services/auth-service`)
- **Ports**: `4001` (gRPC) | `4101` (HTTP Health)
- **Stack**: Node.js, `@grpc/grpc-js`, Prisma 7, PostgreSQL, Bcryptjs, JWT
- **Responsibilities**:
  - User registration, login, and profile management.
  - Issuing Access Tokens (15m expiry) and cryptographically hashed refresh token sessions.
  - Token verification (`VerifyToken` RPC) for API Gateway authorization checks.
  - Storing user preferences, including voice persona selection (`female` vs. `male`).

### 3. Agent Service (`backend/services/agent-service`)
- **Ports**: `4002` (gRPC) | `4102` (HTTP Health)
- **Stack**: Node.js, Groq SDK, LangGraph, Qdrant REST client, Prisma 7, Redis, BullMQ
- **Responsibilities**:
  - Orchestrating multi-turn conversational AI loops via Groq LLM.
  - Server-streaming gRPC `SendVoiceCommand` RPC back to the gateway.
  - Ingesting active browser context (URL, page title, selected text, page DOM snapshot).
  - Generating 384-dimensional vector embeddings and performing semantic memory search on Qdrant.
  - Redis read-through caching for conversation history and vector queries.
  - Producing `conversation-persist` jobs to BullMQ after stream completion.

### 4. Worker Service (`backend/services/worker-service`)
- **Ports**: `4003` (gRPC) | `4103` (HTTP Health)
- **Stack**: Node.js, BullMQ, Redis, Prisma 7, PostgreSQL
- **Responsibilities**:
  - Consuming BullMQ job queues in the background without blocking the real-time agent loop.
  - Transactionally writing user prompts and assistant responses to PostgreSQL.
  - Invalidating Redis cache keys upon new message writes.
  - Processing audit action logs and background analytics.

### 5. Shared Contracts (`shared/proto/`)
- `common/v1/common.proto`: Standard `RequestContext` (requestId, userId, source, timestamp) and `StatusResponse`.
- `auth/v1/auth.proto`: `AuthService` definitions (Register, Login, VerifyToken, RefreshToken, GetProfile, UpdateProfile).
- `agent/v1/agent.proto`: `AgentService` definitions (SendVoiceCommand, CreateConversation, GetConversations, GetMessages, SaveMemory, SearchMemory, DeleteMemory).
- `worker/v1/jobs.proto`: `WorkerJobService` definitions for queueing background operations.

---

## 🧠 AI, Memory & Voice Engine

### Sub-200ms Voice Loop
1. **Audio / Text Input**: The client captures user speech via browser SpeechRecognition or text input.
2. **Gateway Forwarding**: Gateway constructs a gRPC stream call to AgentService with active `RequestContext`.
3. **Context Assembly**: AgentService loads the latest 30 conversation messages from Redis/Postgres and retrieves semantic memories matching the query from Qdrant.
4. **Groq Inference**: Groq LLM streams response tokens; each chunk is emitted via gRPC and pushed to the client as an NDJSON line.
5. **Immediate Audio Synthesis**: The client's Web Speech engine reads chunks as they arrive for zero perceived latency.

### Semantic Memory Architecture (RAG)
- **Vector Embeddings**: 384-dimensional vector embeddings generated for saved memories.
- **Dual-Storage Consistency**: Metadata and canonical records are stored in PostgreSQL (`Memory` model), while vector embeddings with payload filters (`userId`, `category`, `timestamp`) are stored in Qdrant.
- **Supported Categories**: `general`, `user_preference`, `fact`, and `task`.
- **Query Caching**: Semantic search results are cached in Redis for 120 seconds with automatic invalidation on memory mutation.

---

## 💻 Clients & User Interfaces

### 1. Web Application (`apps/web-app`)
- **Stack**: React 18, TypeScript, Vite, Material UI (MUI), Emotion, Zustand, Axios
- **Features**:
  - Dark-mode responsive command dashboard.
  - Interactive voice workspace with real-time waveform visualization and streaming text response rendering.
  - Full conversation history explorer with message reloading.
  - Dedicated Memory Management console for searching, viewing, and evicting vector memories.
  - Profile and Voice Persona configuration (`female` / `male`).
  - Persistent authentication store via Zustand with automated token refresh.

### 2. Chrome Extension (`apps/chrome-extension`)
- **Specification**: Manifest V3
- **Features**:
  - Voice-enabled quick popup interface.
  - `content.js` script to extract active tab context (URL, page title, selected text, snapshot).
  - Integrates with the same API Gateway `/api/agent/*` and `/api/auth/*` endpoints.
  - Secure credential storage in `chrome.storage.local`.

---

## 📡 Public HTTP API Reference

All requests pass through the API Gateway at `http://localhost:5000` (or `http://localhost:8000` via Nginx). Every endpoint supports both its standard path and `/api/*` alias.

### 🔐 Authentication & Profiles — `/auth`

| Method | Endpoint | Auth | Description | Payload |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/auth/register` | No | Register new account & create session | `{ email, password, displayName, voicePreference }` |
| `POST` | `/auth/login` | No | Authenticate & obtain tokens | `{ email, password }` |
| `POST` | `/auth/refresh-token` | No | Rotate and refresh access token | `{ refreshToken }` |
| `POST` | `/auth/verify-token` | Yes | Validate active access token | Bearer Token or `{ accessToken }` |
| `GET` | `/auth/profile` | Yes | Fetch user profile & voice settings | — |
| `PATCH` | `/auth/profile` | Yes | Update display name & voice persona | `{ displayName?, voicePreference? }` |

---

### 💬 Conversations & Voice — `/agent`

| Method | Endpoint | Auth | Description | Payload / Query |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/agent/conversations` | Yes | Create a new conversation session | `{ title?, metadata? }` |
| `GET` | `/agent/conversations` | Yes | List owned conversations | `?limit=50` |
| `GET` | `/agent/conversations/:id/messages` | Yes | Get full chronological message history | — |
| `POST` | `/agent/voice-command` | Yes | **Stream voice command response (NDJSON)** | `{ conversationId, transcript, browserContext? }` |
| `POST` | `/agent/voice/stream` | Yes | Alias for voice command streaming | Same as above |

> **Voice Stream Format**: Responses use `Content-Type: application/x-ndjson`. Each line is an `AgentResponseChunk` JSON object containing `chunk`, `turn_id`, and `is_final`.

---

### 🧠 Semantic Vector Memory — `/agent/memory`

| Method | Endpoint | Auth | Description | Payload / Query |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/agent/memory` | Yes | Embed and store memory in Qdrant & Postgres | `{ content, metadata: { category, ... } }` |
| `GET` | `/agent/memory` | Yes | List persistent memories | `?category=all&limit=100` |
| `GET/POST`| `/agent/memory/search` | Yes | Semantic similarity search via Qdrant | `{ query: string, limit?: number }` |
| `DELETE`| `/agent/memory/:memoryId` | Yes | Evict memory from Postgres & Qdrant | — |

---

### ⚙️ Worker Background Jobs — `/worker`

| Method | Endpoint | Auth | Description | Payload |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/worker/action-log` | Yes | Enqueue asynchronous audit log | `{ idempotencyKey, actionType, payload }` |
| `POST` | `/worker/conversation-persist` | Yes | Enqueue conversation persistence task | `{ idempotencyKey, conversationId, turnId, payload }` |

---

## 🔌 Internal gRPC Service Contracts

Located in `shared/proto/`, compiled and loaded dynamically using `@grpc/proto-loader`:

### `AuthService` (`shared/proto/auth/v1/auth.proto`)
```protobuf
service AuthService {
  rpc Register (RegisterRequest) returns (RegisterResponse);
  rpc Login (LoginRequest) returns (LoginResponse);
  rpc VerifyToken (VerifyTokenRequest) returns (VerifyTokenResponse);
  rpc RefreshToken (RefreshTokenRequest) returns (RefreshTokenResponse);
  rpc GetProfile (GetProfileRequest) returns (GetProfileResponse);
  rpc UpdateProfile (UpdateProfileRequest) returns (UpdateProfileResponse);
}
```

### `AgentService` (`shared/proto/agent/v1/agent.proto`)
```protobuf
service AgentService {
  rpc CreateConversation (CreateConversationRequest) returns (CreateConversationResponse);
  rpc GetConversations (GetConversationsRequest) returns (GetConversationsResponse);
  rpc GetMessages (GetMessagesRequest) returns (GetMessagesResponse);
  rpc SendVoiceCommand (VoiceCommandRequest) returns (stream AgentResponseChunk);
  rpc SaveMemory (SaveMemoryRequest) returns (SaveMemoryResponse);
  rpc SearchMemory (SearchMemoryRequest) returns (SearchMemoryResponse);
  rpc DeleteMemory (DeleteMemoryRequest) returns (DeleteMemoryResponse);
}
```

### `WorkerJobService` (`shared/proto/worker/v1/jobs.proto`)
```protobuf
service WorkerJobService {
  rpc EnqueuePersistConversation (PersistConversationJobRequest) returns (JobResponse);
  rpc EnqueueActionLog (ActionLogJobRequest) returns (JobResponse);
}
```

---

## 🗄️ Database & Data Models

Primary relational data is stored in PostgreSQL via Prisma 7 (`database/prisma/schema.prisma`):

```prisma
model User {
  id              String         @id @default(uuid())
  email           String         @unique
  passwordHash    String
  displayName     String?
  voicePreference String         @default("female")
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  sessions        Session[]
  conversations   Conversation[]
  memories        Memory[]
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  refreshToken String   @unique
  expiresAt    DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Conversation {
  id        String    @id @default(uuid())
  userId    String
  title     String?
  messages  Message[]
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  role           String       // "user" | "assistant"
  content        String
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}

model Memory {
  id        String   @id @default(uuid())
  userId    String
  vectorId  String   @unique
  content   String
  category  String   @default("general")
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 🔌 Port Reference & Network Topology

| Container / Service | Port | Protocol | Purpose |
| :--- | :---: | :---: | :--- |
| **nginx** | `8000` | HTTP | Optional Public Edge Reverse Proxy |
| **gateway** | `5000` | HTTP | Public API Gateway (REST & NDJSON) |
| **auth-service** | `4001` / `4101` | gRPC / HTTP | Internal Auth RPC & Health Check |
| **agent-service** | `4002` / `4102` | gRPC / HTTP | Voice AI, Groq LLM & Qdrant Vector RPC |
| **worker-service** | `4003` / `4103` | gRPC / HTTP | BullMQ Worker Engine & Health Check |
| **redis** | `6379` | TCP | In-Memory Cache, Rate Limiting & BullMQ |
| **postgres** | `5432` | TCP | Relational Persistence (Prisma) |
| **qdrant** | `6333` / `6334` | HTTP / gRPC | Vector Database for Semantic RAG |

---

## 🚀 Getting Started & Local Development

### Prerequisites
- [Docker Desktop](https://www.docker.com/) & Docker Compose v2+
- [Node.js](https://nodejs.org/) v20+ & `npm`
- Groq API Key (for LLM reasoning)

### 1. Launch with Docker Compose
Clone the repository and run all services in containers:

```bash
# 1. Clone the repository
cd Jarvis

# 2. Run the complete stack
docker compose up --build
```

### 2. Database Migrations
Generate Prisma clients and run migrations against PostgreSQL:

```bash
cd database
npm install
npx prisma generate
npx prisma migrate deploy
```

### 3. Running the Web Client
In a separate terminal:

```bash
cd apps/web-app
npm install
npm run dev
```
Open `http://localhost:5173` to access the JARVIS command workspace.

### 4. Running Chrome Extension
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select `apps/chrome-extension/`.

---

## ⚙️ Environment Variables Matrix

### Gateway (`backend/gateway/.env`)
```env
PORT=5000
AUTH_SERVICE_URL=localhost:4001
AGENT_SERVICE_URL=localhost:4002
WORKER_SERVICE_URL=localhost:4003
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
```

### Auth Service (`backend/services/auth-service/.env`)
```env
PORT=4001
HEALTH_PORT=4101
DATABASE_URL=postgresql://jarvis:jarvis_password@localhost:5432/jarvis
JWT_SECRET=your_jwt_secret
```

### Agent Service (`backend/services/agent-service/.env`)
```env
PORT=4002
HEALTH_PORT=4102
DATABASE_URL=postgresql://jarvis:jarvis_password@localhost:5432/jarvis
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

### Worker Service (`backend/services/worker-service/.env`)
```env
PORT=4003
HEALTH_PORT=4103
DATABASE_URL=postgresql://jarvis:jarvis_password@localhost:5432/jarvis
REDIS_URL=redis://localhost:6379
```

---

<p align="center">
  <b>JARVIS</b> — Ultra-low-latency voice intelligence and autonomous task execution.
</p>
