# JARVIS Platform Documentation

JARVIS is a voice-first AI assistant platform. It has a React web application, a Manifest V3 browser extension, an HTTP API gateway, separate authentication/agent/worker services, PostgreSQL persistence through Prisma, Redis caching and queues, and Qdrant semantic memory.

This document describes the repository as it is implemented today. It separates current behavior from intended architecture where those differ, so it can be used both as a technical reference and as a guide for explaining the system to another person.

## 1. Executive summary

The normal request path is:

```text
Web app / Chrome extension
          |
          | HTTP JSON or NDJSON
          v
Nginx (optional :8000) -> API Gateway (:5000)
                              |
                              | gRPC
             +----------------+----------------+
             v                v                v
       Auth service      Agent service     Worker service
             |                |                |
             +--------+-------+                |
                      v                        v
              PostgreSQL/Prisma       Redis + BullMQ
                      ^                        |
                      |                        |
                Qdrant vectors <--------------+
                      ^
                      |
                 Groq LLM
```

The gateway is the public boundary. It validates bearer tokens by calling the auth service, adds a trusted user identity to the request context, and then forwards the request to the correct internal service. The gateway does not access Prisma directly.

PostgreSQL is the source of truth for users, sessions, conversations, messages, and memory records. Qdrant stores embeddings for semantic memory search. Redis is an optimization and coordination layer: cached reads may be skipped when Redis is unavailable, while BullMQ uses Redis to deliver asynchronous persistence jobs.

## 2. Repository structure

Generated clients, build output, and `node_modules` are intentionally omitted from this logical tree.

```text
jarvis/
├── AGENTS.md                         Team and engineering rules
├── JARVIS.md                         This architecture and API reference
├── README.md                         High-level project introduction
├── PLAN.md                           Product/engineering planning notes
├── compose.yaml                      Local Docker topology
├── nginx/
│   └── nginx.conf                    Optional reverse proxy on port 8000
├── prompt/
│   └── prompt.md                     Runtime system prompt mounted into agent-service
├── shared/
│   └── proto/
│       ├── common/v1/common.proto    Request context and status messages
│       ├── auth/v1/auth.proto        AuthService contract
│       ├── agent/v1/agent.proto      AgentService contract
│       └── worker/v1/jobs.proto      WorkerJobService contract
├── database/
│   ├── prisma/schema.prisma          Canonical relational schema
│   ├── prisma/migrations/             Applied schema migrations
│   ├── prisma.config.ts               Prisma 7 datasource configuration
│   └── package.json                   Database scripts and Prisma dependencies
├── apps/
│   ├── web-app/
│   │   ├── src/App.tsx               Browser routes and route guards
│   │   ├── src/main.tsx              React/MUI bootstrap
│   │   ├── src/theme.ts               Dark MUI theme and blue palette
│   │   ├── src/lib/api.ts             Axios and streaming API client
│   │   ├── src/store/authStore.ts     Zustand persisted auth/session state
│   │   ├── src/components/auth/       Protected/public route behavior
│   │   ├── src/components/layout/     Dashboard, sidebar, topbar/header
│   │   ├── src/components/voice/      Voice workspace, speech I/O, commands
│   │   └── src/pages/                 Login, register, workspace, history, memory, settings
│   └── chrome-extension/
│       ├── manifest.json              MV3 permissions and entry points
│       ├── popup.html/js               Extension UI and gateway calls
│       ├── background.js              Extension service worker
│       ├── content.js                 Active-page context extraction
│       └── permission.html/js         Permission-related UI
├── backend/
│   ├── gateway/
│   │   ├── index.js                   Express public HTTP server
│   │   ├── setup.js                   Environment/proto setup
│   │   └── src/
│   │       ├── routes/                Public route registration
│   │       ├── controllers/           HTTP-to-gRPC adapters
│   │       ├── grpc/                  Clients, proto loading, unary helpers
│   │       └── middlewares/           Auth and Redis-backed rate limits
│   └── services/
│       ├── auth-service/
│       │   └── src/                   JWT, bcrypt, sessions, profile, Prisma
│       ├── agent-service/
│       │   └── src/
│       │       ├── services/           Conversations, streaming, memory entry points
│       │       ├── langgraph/           Agent state, Groq loop, tool registry
│       │       ├── memory/              Embeddings, Qdrant, memory persistence
│       │       ├── cache/               Redis read-through cache/invalidation
│       │       └── lib/                 Prisma client
│       └── worker-service/
│           └── src/                    BullMQ workers and async job handlers
└── docs/, doc/                         Existing supplementary project notes
```

## 3. Full technology stack

| Area | Technology | Responsibility |
|---|---|---|
| Web UI | React 18, TypeScript, Vite | Single-page web application |
| UI system | MUI Material, MUI icons, Emotion | Dark responsive dashboard and forms |
| Frontend state | Zustand, persist middleware | Auth/session state across reloads |
| HTTP client | Axios, Fetch streaming | JSON APIs and NDJSON voice stream |
| Routing | React Router | Public/protected routes and nested dashboard outlet |
| Validation | React Hook Form, Zod | Registration/login form validation |
| Browser extension | Chrome Manifest V3 | Popup, service worker, active-tab context |
| Public API | Express 5, CORS | HTTP gateway and health endpoints |
| Internal API | gRPC JS, protobuf | Typed service-to-service communication |
| Authentication | JWT, bcryptjs | Access/refresh tokens and password hashing |
| Relational data | PostgreSQL, Prisma 7, `pg`, `@prisma/adapter-pg` | Durable application data |
| Cache/queue | Redis, ioredis, BullMQ | Cached reads, rate limiting, async jobs |
| Vector memory | Qdrant REST API | Embedding storage and semantic search |
| Embeddings | `EmbeddingProvider` in agent-service | 384-dimensional memory vectors |
| LLM | Groq SDK; configured by `GROQ_MODEL` | Tool calling and streamed answers |
| Containers | Docker Compose | Local multi-service orchestration |
| Reverse proxy | Nginx | Optional port 8000 entry point |
| Testing | Node test runner, gateway contract tests | Protobuf/service contract verification |

The repository guidelines prescribe Tailwind/Radix/Shadcn/Lucide/Framer Motion in some places, while the current primary web screens use MUI and MUI icons. The running implementation is the source of truth for current behavior; the prescribed stack is a future consistency guideline.

## 4. Docker and runtime topology

`compose.yaml` defines:

| Container | Ports | Role |
|---|---:|---|
| `nginx` | host 8000 -> 80 | Optional reverse proxy to gateway |
| `gateway` | 5000 | Public API |
| `auth-service` | 4001 gRPC, 4101 health | Authentication and profiles |
| `agent-service` | 4002 gRPC, 4102 health | AI, conversations, memory |
| `worker-service` | 4003 gRPC, 4103 health | Queued jobs |
| `redis` | 6379 | Cache, rate limits, BullMQ |
| `postgres` | 5432 | Local PostgreSQL option |
| `qdrant` | 6333 HTTP, 6334 gRPC | Vector database |

The services receive settings from their own `.env` files. The repository also contains a local Postgres container, but the deployed services may instead point at Neon PostgreSQL through `DATABASE_URL`. Always verify the service `.env` values before assuming which database is active. Secrets and connection strings must not be committed or copied into documentation.

Useful commands:

```bash
docker compose up --build
docker compose ps
cd database && npx prisma generate
cd database && npx prisma migrate deploy
cd backend/gateway && npm run test:contracts
```

Health checks are available at `/health` on the gateway and `/health` on each service health port.

## 5. Service boundaries and ownership

### Gateway

The gateway owns public HTTP routing, CORS, request parsing, rate limiting, request IDs, bearer-token verification calls, and HTTP/gRPC translation. It does not own business data and must not query Prisma.

### Auth service

The auth service owns user creation, password verification, JWT signing/verification, refresh-token sessions, and profile updates. Passwords are stored only as bcrypt hashes. Refresh tokens are stored as hashes in `Session`.

### Agent service

The agent service owns conversation creation/history reads, AI orchestration, response streaming, vector memory operations, and the queue producer for conversation persistence. It loads the system prompt and calls Groq and Qdrant as needed.

### Worker service

The worker service consumes BullMQ queues. Conversation persistence is performed in a transaction that creates the user and assistant messages and updates the conversation timestamp. Action logging, analytics, and memory-write handlers currently log/acknowledge jobs; memory saving itself is currently synchronous in agent-service.

### Clients

The web app uses the gateway as its only backend boundary. The extension uses the same gateway and stores its access token in `chrome.storage.local`. The web app uses browser `localStorage` through Zustand persistence.

## 6. End-to-end data flows

### 6.1 Web application startup

1. `main.tsx` mounts React, the MUI theme, and `CssBaseline`.
2. `App.tsx` selects a public or protected route.
3. `ProtectedRoute` calls the auth store's deduplicated `hydrate()` operation.
4. The store reads persisted tokens from `localStorage`.
5. If an access token exists, it asks `/auth/verify-token` and then `/auth/profile` for current identity/profile data.
6. If access has expired, the Axios interceptor/store attempts `/auth/refresh-token` using the refresh token.
7. A valid user reaches the nested dashboard layout; an invalid session is cleared and redirected to `/login`.

### 6.2 Register and login

1. The web form validates email/password and, on registration, the selected `female` or `male` voice preference.
2. The client sends `POST /auth/register` or `POST /auth/login`.
3. The gateway rate-limits the request and calls AuthService over gRPC.
4. AuthService normalizes the email, checks credentials, and uses Prisma.
5. Registration creates `User`; login creates a hashed refresh-token `Session`.
6. AuthService returns an access token, refresh token, expiry, user identity, and voice preference.
7. The client stores the session and navigates to `/workspace`.

### 6.3 Authenticated request identity

1. The client sends `Authorization: Bearer <access-token>`.
2. Gateway auth middleware calls AuthService `VerifyToken`.
3. On success, the gateway creates a `RequestContext` containing request ID, verified user ID, source, and timestamp.
4. That context is passed through the protobuf request to agent or worker service.
5. Agent and worker services use `context.userId` in every Prisma/Qdrant ownership query.

This identity propagation is the security boundary that prevents one user from reading another user's conversations or memories.

### 6.4 Conversation creation, message send, and history

1. The workspace obtains a conversation ID from the URL when opening an existing conversation.
2. For a new workspace, it calls `POST /agent/conversations` once before sending the first command.
3. The client sends `POST /agent/voice-command` with `conversationId`, `transcript`, and optional browser context.
4. Gateway forwards a server-streaming gRPC `SendVoiceCommand` call.
5. Agent-service reads up to the latest 30 stored messages from Redis or PostgreSQL and passes them to `AgentState`.
6. `AgentState` appends the current transcript after prior user/assistant messages.
7. The agent may call tools, then streams generated chunks back through gRPC.
8. Gateway converts each chunk to one JSON line (`application/x-ndjson`) and flushes it to the client.
9. After generation, agent-service enqueues a `conversation-persist` BullMQ job.
10. Worker-service validates that the conversation belongs to the user, then transactionally writes the user message and assistant response.
11. Worker invalidates the conversation list and conversation-message cache.
12. History calls `GET /agent/conversations`; opening a conversation calls `GET /agent/conversations/{id}/messages`.

The durable write is intentionally asynchronous to keep time-to-first-response low. A queue outage can therefore make the response appear successful while persistence is delayed or unavailable; queue monitoring and retry handling are important operational requirements.

### 6.5 Memory save and semantic search

Save flow:

1. The client sends `POST /agent/memory` with content and optional category metadata.
2. Agent-service validates content and generates a 384-dimensional embedding.
3. It creates a UUID memory ID and a Qdrant point ID.
4. It upserts the vector with payload containing user ID, content, category, metadata, and timestamp.
5. For a real UUID user, it writes the durable `Memory` row through Prisma with the matching Qdrant `vectorId`.
6. It invalidates all cached memory lists and semantic searches for that user.

Search flow:

1. The client sends `GET` or `POST /agent/memory/search` with a query and limit.
2. Agent-service checks a normalized-query Redis key.
3. On a miss, it embeds the query and asks Qdrant for nearest vectors filtered by `userId`.
4. Results below the configured minimum score are removed and the result is cached for 120 seconds.

Delete removes the Prisma row and the matching Qdrant point, then invalidates memory caches. PostgreSQL is the durable catalog; Qdrant is the search index.

### 6.6 Browser extension flow

1. The MV3 popup reads the access token from `chrome.storage.local`.
2. `content.js` can expose the active tab's URL, title, selected text, headings, and a bounded page-text snapshot.
3. The popup combines the transcript with browser context.
4. It sends the request to the gateway using `/api/auth/*` and `/api/agent/*` aliases.
5. The gateway's aliases map to the same auth and agent controllers as the non-`/api` routes.
6. The extension reads the NDJSON stream, displays text, and uses browser SpeechSynthesis for playback.

## 7. Application workflow

```text
Unauthenticated
   |
   +--> Register --select voice--> Auth session --> Workspace
   |
   +--> Login --------------------> Auth session --> Workspace

Workspace
   |
   +--> new conversation --> create ID --> voice/text turn --> stream --> persist job
   +--> old conversation --> load messages --> continue same conversation
   +--> browser context --> agent tools/answer

Dashboard navigation
   |
   +--> Workspace: speak, submit transcript, see streamed answer
   +--> History: list conversations, reopen one
   +--> Memory: list, search, save, delete vector memories
   +--> Settings: update profile and voice preference
```

The web routes are `/login`, `/register`, `/forgot-password`, `/reset-password`, `/dashboard`, `/workspace`, `/history`, `/memory`, and `/settings`. `/dashboard` redirects to `/workspace`. The dashboard uses an outlet so the sidebar/topbar remain mounted while child pages change.

## 8. Public HTTP API

The gateway is available at `http://localhost:5000`; Nginx optionally exposes it at `http://localhost:8000`. Every authenticated endpoint accepts both the documented path and its `/api` alias.

### Common conventions

- JSON request and response bodies, except voice streaming.
- Auth header: `Authorization: Bearer <access-token>`.
- Successful service responses contain `status: { ok: true, message }`.
- Invalid/missing auth normally produces HTTP 401.
- Redis rate-limit exhaustion produces HTTP 429.
- Downstream gRPC/service failures are translated by the gateway error handler.
- Voice responses use `Content-Type: application/x-ndjson`; each line is an `AgentResponseChunk` JSON object.

### Health and root

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | No | Gateway health: `{status, service}` |
| GET | `/` | No | Gateway running message and port |

### Authentication and profile

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/auth/register` | `{email,password,displayName,voicePreference}` | Create user and return session |
| POST | `/auth/login` | `{email,password}` | Authenticate and return session |
| POST | `/auth/refresh-token` | `{refreshToken}` | Rotate/refresh session tokens |
| POST | `/auth/verify-token` | Bearer token or `{accessToken}` | Validate access token |
| GET | `/auth/profile` | — | Return current profile |
| PATCH | `/auth/profile` | `{displayName,voicePreference}` | Update profile |

`voicePreference` is currently `female` or `male`, defaulting to `female`. Browser voice selection is best-effort because actual SpeechSynthesis voices depend on the operating system/browser.

Typical session shape:

```json
{
  "session": {
    "userId": "uuid",
    "email": "user@example.com",
    "displayName": "User",
    "voicePreference": "female",
    "accessToken": "jwt",
    "refreshToken": "opaque-or-jwt",
    "expiresInSeconds": 900
  }
}
```

### Conversations and voice

| Method | Path | Body/query | Purpose |
|---|---|---|---|
| POST | `/agent/conversations` | `{title?,metadata?}` | Create one conversation for the authenticated user |
| GET | `/agent/conversations` | `?limit=50` | List owned conversations, count, and last message |
| GET | `/agent/conversations/{conversationId}/messages` | — | Load all messages in chronological order |
| POST | `/agent/voice-command` | `{conversationId,transcript,browserContext?}` | Stream AI response and enqueue persistence |
| POST | `/agent/voice/stream` | Same as above | Alias for voice command streaming |
| GET | `/agent/responses/{conversationId}/{turnId}` | — | Legacy/contract stream endpoint; current implementation returns a wired placeholder stream |

`browserContext` can contain `url`, `title`, `selectedText`, and `pageText`. A stream chunk contains `conversation_id`, `turn_id`, `chunk`, and `is_final` (protobuf naming may be converted by the JS loader). The final chunk includes metadata such as tool count and latency where available.

### Vector memory

| Method | Path | Body/query | Purpose |
|---|---|---|---|
| POST | `/agent/memory` | `{content,metadata?:{category,...}}` | Embed and save a memory |
| GET | `/agent/memory` | `?category=all&limit=100` | List durable memories |
| GET/POST | `/agent/memory/search` | `query`, optional `limit` | Semantic memory search |
| DELETE | `/agent/memory/{memoryId}` | — | Delete owned memory from PostgreSQL and Qdrant |

Memory categories currently include `general`, `user_preference`, `fact`, and `task` by convention; the schema does not use a database enum.

### Worker enqueue endpoints

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/worker/action-log` | `{idempotencyKey,actionType,conversationId,payload}` | Enqueue non-critical action logging |
| POST | `/worker/conversation-persist` | `{idempotencyKey,conversationId,turnId,payload}` | Enqueue persistence job |

These are authenticated internal-facing gateway endpoints. Normal voice persistence is produced directly by agent-service, while these routes expose the worker contract for other callers.

## 9. Internal gRPC contracts

All contracts are in `shared/proto` and use `jarvis.common.v1.RequestContext`.

### AuthService (`auth.proto`)

- `Register(RegisterRequest) -> RegisterResponse`: email, password, display name, voice preference.
- `Login(LoginRequest) -> LoginResponse`: credentials to session.
- `VerifyToken(VerifyTokenRequest) -> VerifyTokenResponse`: token status, user ID, email, expiry.
- `RefreshToken(RefreshTokenRequest) -> RefreshTokenResponse`: refresh session.
- `GetProfile(GetProfileRequest) -> GetProfileResponse`: current profile.
- `UpdateProfile(UpdateProfileRequest) -> UpdateProfileResponse`: display name and voice preference.

### AgentService (`agent.proto`)

- `StartConversation`: creates a user-owned conversation.
- `ListConversations`: returns summaries.
- `GetConversationMessages`: returns ordered messages.
- `SendVoiceCommand`: server stream of response chunks.
- `StreamAgentResponse`: server stream contract retained for compatibility.
- `SaveMemory`: writes vector and relational memory.
- `SearchMemory`: semantic search.
- `ListMemories`: relational memory list.
- `DeleteMemory`: deletes owned memory.

### WorkerJobService (`jobs.proto`)

- `EnqueueActionLog`: accepts idempotency key, action type, conversation ID, JSON payload.
- `EnqueueConversationPersist`: accepts idempotency key, conversation ID, turn ID, and JSON payload.

## 10. Database schema

The canonical schema is `database/prisma/schema.prisma`. All IDs are UUID strings backed by PostgreSQL UUID columns.

### User

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key, generated |
| `email` | String | Unique, normalized by auth service |
| `displayName` | String? | Optional display name |
| `voicePreference` | String | Default `female`; application values `female`/`male` |
| `passwordHash` | String | bcrypt hash; never return to clients |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Prisma update timestamp |

Relations: one user has many sessions, conversations, and memories.

### Session

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | User foreign key, cascade delete |
| `refreshTokenHash` | String | Unique |
| `expiresAt` | DateTime | Indexed for expiry queries |
| `createdAt` | DateTime | Creation timestamp |
| `revokedAt` | DateTime? | Set when revoked |

Indexes: `userId`, `expiresAt`.

### Conversation

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | User owner |
| `title` | String? | Defaults to `New conversation` in service behavior |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Updated when persistence completes |

Relations: one user owns many conversations; one conversation has many messages. Service queries always scope by `userId`.

### Message

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `conversationId` | UUID | Conversation foreign key |
| `content` | String | User or assistant text |
| `role` | String | Application values `user` or `assistant` |
| `createdAt` | DateTime | Creation timestamp |

Indexes: `conversationId`, `createdAt`.

### Memory

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key and public memory ID |
| `userId` | UUID | User owner, cascade delete |
| `content` | String | Remembered text |
| `category` | String | Default `general` |
| `metadata` | JSON? | Flexible application metadata |
| `vectorId` | String? | Corresponding Qdrant point ID |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Prisma update timestamp |

Indexes: `userId`, `category`.

### Relationships

```text
User 1 ---- * Session
User 1 ---- * Conversation 1 ---- * Message
User 1 ---- * Memory 1 ---- 1 Qdrant point (logical relationship via vectorId)
```

The initial identity migration creates users/sessions. The conversations/messages/memory migration creates the assistant data model. The voice-preference migration adds the selected browser voice profile.

## 11. AI and memory architecture

`LangGraphAgent` creates an `AgentState` containing conversation ID, verified user ID, transcript, browser context, prior messages, reasoning steps, tool calls, and response metadata.

The current tool registry includes:

- calculator: safe calculation utility;
- time: current time utility;
- weather: weather lookup tool;
- search: external/search capability where configured;
- memory access: retrieve relevant user memories;
- memory store: save user memories.

The agent loads `prompt/prompt.md`, uses Groq chat completions, allows up to four tool/reasoning steps, uses low temperature for direct answers, and streams a final answer. If the SDK/key is unavailable, it emits a local fallback response.

The prompt is designed for serious daily use: answer directly, be concise but informative, state uncertainty, avoid invented facts, use tools when current or computed data is needed, and avoid exposing private internal reasoning.

## 12. Redis and cache design

Cache keys are namespaced with `jarvis:v1` and include the authenticated user ID.

| Data | Key pattern | TTL |
|---|---|---:|
| Conversation list | `jarvis:v1:user:{userId}:conversations:{limit}` | 45s |
| Conversation messages | `jarvis:v1:user:{userId}:conversation:{conversationId}:messages` | 180s |
| Memory list | `jarvis:v1:user:{userId}:memories:{category}:{limit}` | 60s |
| Memory search | `jarvis:v1:user:{userId}:memory-search:{sha256(query)}:{limit}` | 120s |

Mutation invalidation:

- new conversation or persisted turn: remove the user's conversation-list keys and the changed conversation's message key;
- save/delete memory: remove the user's memory-list keys and memory-search keys;
- Redis errors fail open, so the application attempts the PostgreSQL/Qdrant path rather than treating cache failure as data loss.

The cache is not authoritative. A cache hit must never bypass user ownership because the user ID is part of the key and the underlying service still enforces ownership on database operations.

## 13. Queues and asynchronous work

BullMQ queues are backed by Redis:

- `conversation-persist`: writes user/assistant messages in a Prisma transaction;
- `action-log`: records action events (currently log-oriented handler);
- `memory-write`: queue contract exists, but actual memory save currently happens synchronously in agent-service;
- `analytics`: records metrics (currently log-oriented handler).

Jobs use idempotency keys where exposed. Conversation jobs retry up to three times with exponential backoff and remove completed/old failed jobs according to worker configuration.

## 14. Security model and operational safeguards

- Passwords are bcrypt-hashed.
- Access and refresh token secrets live in environment variables.
- Refresh tokens are hashed in the database.
- Gateway verifies bearer tokens before protected agent/worker requests.
- Every conversation and memory read/delete is scoped to the authenticated user ID.
- Qdrant searches include a user filter.
- Auth endpoints use a stricter Redis-backed rate limit; other routes use the standard limiter.
- Rate limiter failures are fail-open for availability; production deployments should monitor Redis health and consider a fail-closed policy for sensitive authentication traffic.
- Do not log passwords, tokens, database URLs, or API keys.
- CORS is currently broad in the gateway; production should restrict allowed origins.
- Browser speech voices are local browser capabilities, not secure server-side voice identities.

## 15. Frontend responsibilities

### Login/register

MUI forms call the auth store. Registration includes a compact voice selection (`female` or `male`). OAuth/Google login is intentionally not configured by the current implementation.

### Dashboard shell

`Dashboard.tsx` composes the responsive sidebar and topbar and renders child routes through React Router's `Outlet`. The sidebar uses a permanent desktop drawer and temporary mobile drawer. The topbar owns route title, mobile menu, account menu, settings navigation, and sign-out.

### Workspace

`VoiceWorkspace` handles microphone speech recognition when available, transcript submission, conversation selection, historical message loading, streamed response assembly, browser actions, and SpeechSynthesis playback. It creates a conversation once per workspace session and reuses its ID for turns.

### History

History loads conversation summaries from the backend and opens a selected conversation by navigating to `/workspace?conversationId=...`.

### Memory

Memory uses the backend list/search/save/delete APIs. It does not treat mock data as the source of truth.

### Settings

Settings updates the profile voice preference and exposes browser speech controls. The selected preference is also used by the workspace's voice matching logic.

## 16. Known limitations and items to verify

These are important when explaining current behavior:

1. Conversation persistence is asynchronous. The agent response is streamed before the worker writes messages. A failed worker/Redis path needs operational monitoring and a recovery strategy.
2. `StreamAgentResponse` is retained for contract compatibility but currently emits a placeholder response; normal clients use `SendVoiceCommand`.
3. Browser SpeechSynthesis cannot guarantee a particular male or female voice. It selects a best-effort installed voice and adjusts pitch/rate.
4. Qdrant and PostgreSQL can become temporarily inconsistent if one write succeeds and the other fails. A production design should add an outbox/reconciliation process.
5. The local Postgres Compose container and Neon PostgreSQL can both exist in configuration. The active `DATABASE_URL` decides the real database.
6. Some repository guidance describes Tailwind/Radix/Lucide while the current main screens use MUI. Consolidating the design system would reduce maintenance.
7. The README's latency goals are targets, not guarantees. LLM generation, tool calls, database access, Qdrant, and network distance determine actual latency.
8. Forgot/reset-password screens exist in the frontend, but the current gateway/auth protobuf surface shown here does not expose a corresponding production password-reset workflow.
9. The extension has `/api` gateway aliases, which is intentional and keeps it compatible with the same gateway.

## 17. How to explain JARVIS to someone else

“JARVIS is a browser-based voice assistant. The browser never talks directly to databases or the language model. It sends a request to a stateless gateway. The gateway authenticates the user and forwards the request over gRPC to a specialized service. Auth-service handles identity. Agent-service loads recent conversation context, retrieves relevant semantic memories, calls the language model and tools, then streams the answer. The worker saves the turn asynchronously so the user sees the first response quickly. PostgreSQL stores the durable records, Qdrant makes memories searchable by meaning, and Redis makes repeated history/memory reads faster and transports background jobs. Every request carries the verified user ID, so history and memories are isolated per user.”

## 18. Recommended next production steps

1. Add queue health, failed-job alerts, and a replay/reconciliation path.
2. Add integration tests for register/login, token refresh, conversation ownership, persistence, and memory ownership.
3. Add an outbox or transactional event design for PostgreSQL-to-Qdrant consistency.
4. Restrict CORS and secure all production environment variables.
5. Add pagination to conversation messages and memory lists.
6. Replace string roles/categories with validated application constants or database enums.
7. Decide whether MUI or the prescribed Tailwind/Radix stack is the long-term frontend design system.
8. Add an explicit server-side text-to-speech provider only if identical voices across browsers/devices are required.

