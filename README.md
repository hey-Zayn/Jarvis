# Jarvis AI

Jarvis AI is a voice-enabled browser assistant platform built as a production-minded microservices monorepo. The finished application gives a signed-in Chrome user a compact extension and dashboard for issuing typed or spoken commands such as "open YouTube", "search the web for backend jobs", "close this tab", and "summarize this page".

The core idea is simple: the browser handles fast local voice input and browser actions, while the backend authenticates the user, classifies intent, retrieves user context, returns a safe structured action, and records activity asynchronously without slowing the real-time command path.

## What Jarvis Builds

Jarvis is designed as a complete voice-first AI assistant for browser workflows:

- A Manifest V3 Chrome extension for sign-in, typed commands, voice commands, active-tab context, text-to-speech replies, and safe browser actions.
- A React + Vite + TypeScript dashboard for account settings, saved preferences, command history, and activity review.
- A stateless API gateway that accepts external HTTP/WebSocket traffic and talks to backend services through gRPC.
- An authentication service that owns user registration, login, password hashing, and JWT verification.
- An agent service that turns natural-language prompts into deterministic browser actions.
- A worker service that processes audit logs, history sync, embeddings, and other background tasks through BullMQ.
- PostgreSQL/Prisma for relational data and Qdrant for user-scoped semantic memory.
- Redis for low-latency queues and real-time coordination.
- NGINX as the edge proxy for HTTP and WebSocket upgrade traffic.

## Current Repository Status

This repository currently contains the Phase 1 foundation and service scaffolding:

- TypeScript npm workspace.
- Docker Compose stack for PostgreSQL, Redis, services, migration job, and NGINX.
- Prisma schema and initial migration for `User`, `ActionLog`, and `UserMemory`.
- Protobuf contracts for auth and agent service communication.
- Stubbed service entrypoints for `api-gateway`, `auth-service`, `agent-service`, and `worker-service`.
- OpenCode/Codex agent role files used to guide development work.

The README is written for the completed application, while this section explains what is implemented today so future readers can distinguish finished architecture from current scaffold.

## Product Promise

After the application is complete, a user can:

1. Install the Chrome extension.
2. Register or sign in.
3. Type or speak a supported command.
4. Let Jarvis classify the command into one validated browser action.
5. See the extension execute that action.
6. Hear a short confirmation through browser text-to-speech.
7. Review command history and saved preferences in the dashboard.

The MVP focuses on useful, explicit browser help. Jarvis does not silently browse, purchase, submit forms, delete data, or perform risky multi-step automation without clear user control.

## Supported MVP Commands

| Action | Example command | Result |
| --- | --- | --- |
| `SEARCH_WEB` | "Search the web for AWS Cloud Practitioner notes" | Opens a new search tab with an encoded query. |
| `OPEN_TAB` | "Open Gmail" | Opens a known destination in a new tab. |
| `CLOSE_TAB` | "Close this tab" | Closes the active tab only after explicit user intent. |
| `SUMMARIZE_PAGE` | "Summarize this page" | Reads page content from the active tab and returns a concise summary. |
| `ANSWER_FROM_MEMORY` | "What job sites do I usually check?" | Retrieves user-scoped memory and answers from saved preferences. |

Unsupported or unclear commands return a clarification response and do not trigger a browser action.

## Architecture Overview

Jarvis uses an event-driven microservices architecture. The design keeps the user-facing voice path fast by separating synchronous command handling from background persistence.

```mermaid
flowchart TD
    Extension[Chrome Extension - Manifest V3]
    Dashboard[React Dashboard]
    Nginx[NGINX Edge Proxy]
    Gateway[API Gateway - Express + Socket.io]
    Auth[Auth Service - gRPC]
    Agent[Agent Service - LangGraph]
    Redis[(Redis)]
    Worker[Worker Service - BullMQ]
    Postgres[(PostgreSQL - Prisma)]
    Qdrant[(Qdrant Vector DB)]
    LLM[Groq / Gemini]

    Extension -->|HTTPS / WebSocket| Nginx
    Dashboard -->|HTTPS| Nginx
    Nginx --> Gateway
    Gateway -->|VerifyToken gRPC| Auth
    Gateway -->|ProcessCommand gRPC| Agent
    Gateway -->|enqueue audit job| Redis
    Worker -->|consume jobs| Redis
    Worker -->|write logs and memories| Postgres
    Auth -->|user reads/writes| Postgres
    Agent -->|semantic retrieval| Qdrant
    Agent -->|tool classification| LLM
    Worker -->|embedding sync| Qdrant
```

## Core Design Rules

- The `api-gateway` is stateless and does not query the database directly.
- Internal service communication uses Protobuf contracts in `shared/proto`.
- Non-critical writes run through BullMQ and Redis instead of blocking the command response.
- Browser actions are deterministic JSON payloads, not free-form model output.
- User memory is partitioned by user ID so one user's context cannot leak into another user's retrieval.
- Secrets stay in environment variables and production secret stores, never in source code.

## Request Flow

### Authentication

1. The extension or dashboard sends register/login credentials to the gateway.
2. The gateway forwards the request to `auth-service` through gRPC.
3. `auth-service` validates input, hashes passwords with bcrypt, reads/writes the `User` model through Prisma, and issues a JWT.
4. The client stores the JWT in `chrome.storage.local` for the extension or secure browser storage for the dashboard.
5. Later WebSocket connections pass the JWT during connection setup.
6. The gateway calls `AuthService.VerifyToken` before accepting commands.

### Voice Command

1. The user opens the extension popup and starts listening.
2. The extension uses native browser speech recognition, such as `webkitSpeechRecognition`, to convert speech to text locally.
3. The extension sends the recognized text plus active-tab context over an authenticated Socket.io connection.
4. The gateway verifies the user session through `auth-service`.
5. The gateway calls `agent-service` through `AgentService.ProcessCommand`.
6. `agent-service` retrieves relevant user memory from Qdrant, classifies the command with the LLM workflow, validates the action, and returns a `CommandResponse`.
7. The gateway emits the action to the extension and enqueues an audit job in Redis.
8. The extension executes the action with Chrome APIs and speaks `spoken_reply` through `chrome.tts`.
9. `worker-service` later persists the action log and memory updates.

### Background Logging

The command path does not wait for PostgreSQL writes. The gateway pushes audit data into Redis, then returns the user-facing response. `worker-service` consumes jobs from BullMQ and writes durable history to PostgreSQL. This keeps the voice interaction responsive even when the database, embeddings, or analytics are slower than usual.

## Services

### `api-gateway`

The API gateway is the public backend entrypoint.

Responsibilities:

- Expose REST routes for authentication and health checks.
- Host Socket.io connections for real-time command traffic.
- Validate JWTs by calling `auth-service`.
- Forward command requests to `agent-service` through gRPC.
- Enqueue non-critical audit events into Redis/BullMQ.
- Return only validated action payloads to clients.

Rules:

- No direct Prisma client.
- No direct database queries.
- No long-running AI, embedding, analytics, or logging work.

Current entrypoint: `services/api-gateway/src/index.ts`

### `auth-service`

The auth service owns identity and token validation.

Responsibilities:

- Register users.
- Hash and verify passwords.
- Issue JWTs.
- Verify JWTs for gateway WebSocket and REST requests.
- Read and write `User` records through Prisma.

Internal contract: `shared/proto/auth.proto`

Current entrypoint: `services/auth-service/src/index.ts`

### `agent-service`

The agent service owns AI orchestration.

Responsibilities:

- Receive a user command and active-tab context.
- Retrieve user-specific memory from Qdrant.
- Run LangGraph command classification.
- Call low-latency LLM providers such as Groq or Gemini.
- Produce deterministic action JSON matching `agent.proto`.
- Validate action safety before returning to the gateway.

Example returned action:

```json
{
  "action": "OPEN_TAB",
  "target_url": "https://www.youtube.com/results?search_query=lo-fi+hip+hop",
  "spoken_reply": "Searching YouTube for lo-fi hip hop.",
  "raw_context": "{\"confidence\":0.96}"
}
```

Internal contract: `shared/proto/agent.proto`

Current entrypoint: `services/agent-service/src/index.ts`

### `worker-service`

The worker service handles work that should not block the real-time path.

Responsibilities:

- Consume BullMQ jobs from Redis.
- Persist action logs to PostgreSQL.
- Create or update user memory records.
- Generate embeddings for long-term memory.
- Batch non-urgent writes where useful.
- Handle retryable failures outside the user request path.

Current entrypoint: `services/worker-service/src/index.ts`

### `apps/chrome-extension`

The Chrome extension is the primary user surface for Jarvis.

Completed-app responsibilities:

- Manifest V3 extension shell.
- Popup UI built with React, Vite, TypeScript, Tailwind CSS, Radix/Shadcn primitives, Lucide icons, Framer Motion, and Zustand.
- Auth token storage in `chrome.storage.local`.
- Socket.io connection to the gateway.
- Typed command input.
- Voice capture through browser speech recognition.
- Spoken feedback through `chrome.tts`.
- Browser actions through Chrome extension APIs.
- Content scripts for extracting readable page text during summarization.

### `apps/dashboard`

The dashboard gives the user account and history management.

Completed-app responsibilities:

- Account and session management.
- Command history.
- Saved preferences and memory review.
- Error states, loading skeletons, and accessible controls.
- Dark-mode-first industrial UI using the project design system.

## Protobuf Contracts

Jarvis uses contract-first internal communication. The gateway, auth service, and agent service communicate through binary gRPC over HTTP/2 using Protobuf definitions.

### Auth Service

`shared/proto/auth.proto`

```proto
syntax = "proto3";

package jarvis.auth.v1;

service AuthService {
  rpc Register(RegisterRequest) returns (AuthResponse);
  rpc Login(LoginRequest) returns (AuthResponse);
  rpc VerifyToken(TokenRequest) returns (TokenValidationResponse);
}
```

### Agent Service

`shared/proto/agent.proto`

```proto
syntax = "proto3";

package jarvis.agent.v1;

service AgentService {
  rpc ProcessCommand(CommandRequest) returns (CommandResponse);
}
```

Breaking contract changes should be handled through API versioning instead of mutating existing fields in-place.

## Data Model

The relational database is PostgreSQL managed through Prisma.

### `User`

Stores account identity.

Fields:

- `id`: UUID primary key.
- `email`: unique login email.
- `passwordHash`: hashed password, never plaintext.
- `name`: optional display name.
- `logs`: related action history.
- `memories`: related user memory records.
- `createdAt` and `updatedAt`: lifecycle timestamps.

### `ActionLog`

Stores completed browser actions for history and auditing.

Fields:

- `id`: UUID primary key.
- `action`: action type such as `OPEN_TAB` or `SEARCH_WEB`.
- `targetUrl`: optional destination URL.
- `userId`: owner ID.
- `createdAt`: event timestamp.

`userId` is indexed for fast history lookups.

### `UserMemory`

Stores durable memory metadata tied to vector records.

Fields:

- `id`: UUID primary key.
- `vectorId`: unique Qdrant vector reference.
- `content`: source memory text.
- `userId`: owner ID.
- `createdAt`: creation timestamp.

`userId` is indexed so dashboard and worker queries remain efficient.

## Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Monorepo | npm workspaces | Shared package management for services. |
| Language | TypeScript | Typed application code across services and apps. |
| Runtime | Node.js 22 | Backend service runtime. |
| Gateway | Express, Socket.io | REST, health checks, and real-time command streams. |
| IPC | gRPC, Protobuf, HTTP/2 | Fast typed service-to-service calls. |
| Auth | JWT, bcrypt | Session tokens and password hashing in the completed auth service. |
| AI workflow | LangGraph | Stateful command classification and tool orchestration. |
| LLM providers | Groq / Gemini | Low-latency natural-language reasoning. |
| Queue | BullMQ | Durable background job processing. |
| Cache/Queue backend | Redis | In-memory queue and coordination layer. |
| Database | PostgreSQL / Neon | Durable relational storage. |
| ORM | Prisma | Typed database schema, migrations, and client. |
| Vector memory | Qdrant | Semantic memory and retrieval-augmented context. |
| Extension | Chrome Manifest V3 | Browser integration and user command surface. |
| Frontend | React, Vite, TypeScript | Extension popup and dashboard UI. |
| Styling | Tailwind CSS | Utility-first design system. |
| UI primitives | Radix UI / Shadcn UI | Accessible headless components. |
| Icons | Lucide React | Consistent interface icons. |
| Animation | Framer Motion | Subtle UI transitions and feedback. |
| State | Zustand | Lightweight client state management. |
| Edge | NGINX | Reverse proxy and WebSocket upgrade handling. |
| Containers | Docker Compose | Local service orchestration. |
| CI | GitHub Actions | Build and typecheck automation. |

## Folder Structure

```text
jarvis/
  apps/
    chrome-extension/        Chrome MV3 extension app.
    dashboard/               React dashboard app.
  database/
    prisma/
      schema.prisma          Prisma models and datasource.
      migrations/            Database migration history.
  docs/
    PHASE_0_MVP.md           MVP definition, scope, and acceptance criteria.
  infrastructure/
    docker/
      Dockerfile.service     Shared service Docker build file.
    nginx/
      default.conf           NGINX reverse proxy config.
  services/
    api-gateway/             Public REST/WebSocket gateway.
    auth-service/            gRPC identity service.
    agent-service/           gRPC AI command service.
    worker-service/          BullMQ background worker.
  shared/
    proto/                   Protobuf service contracts.
    types/                   Shared TypeScript types.
    utils/                   Shared helper utilities.
  .opencode/
    agent/                   Codex/OpenCode agent role definitions.
    commands/                Project command helpers.
    skill/                   Project-specific development skills.
  .github/
    workflows/               CI workflows.
  compose.yaml               Local multi-service stack.
  package.json               Root workspace scripts.
  SYSTEM_ARCHITECTURE.md     Detailed architecture specification.
  PLAN.md                    Phase-by-phase delivery plan.
```

## Codex/OpenCode Agents

The repository uses role-specific agent files under `.opencode/agent` to keep AI-assisted development disciplined. These agents act like focused reviewers and implementers for different parts of the platform.

| Agent | Role |
| --- | --- |
| `tech-lead.md` | Owns architecture, gRPC contract integrity, stateless gateway rules, and code quality. |
| `product-manager.md` | Defines features, user flows, acceptance criteria, and protects MVP scope. |
| `backend-engineer.md` | Builds Node.js microservices, gRPC IPC, Prisma access, BullMQ jobs, and low-latency backend flows. |
| `senior-frontend.md` | Builds polished React/TypeScript UI, Chrome extension UX, WebSocket resilience, and MV3 frontend behavior. |
| `design-engineer.md` | Owns Tailwind design tokens, accessibility, loading/error states, and extension/dashboard layout quality. |
| `extension-engineer.md` | Specializes in Manifest V3, Chrome APIs, content scripts, Socket.io, speech recognition, and `chrome.tts`. |
| `ai-engineer.md` | Owns LangGraph orchestration, prompt design, Qdrant retrieval, and deterministic action schemas. |
| `security-auditor.md` | Reviews for hardcoded secrets, unsafe input handling, SQL injection risks, missing indexes, and resilience gaps. |

### How We Use Agents

1. The Product Manager defines the user flow and acceptance criteria.
2. The Tech Lead checks architecture fit and service boundaries.
3. Backend, AI, Extension, Frontend, and Design agents implement their respective layers.
4. The Security Auditor reviews changes before release.
5. The Tech Lead validates contracts, performance assumptions, and system consistency.

This keeps the project from becoming one large unstructured AI-generated codebase. Each agent enforces a narrow set of rules that map to the real system architecture.

## Local Development

### Prerequisites

- Node.js 22 or newer.
- npm.
- Docker Desktop.
- PostgreSQL and Redis through Docker Compose, or compatible external services.

### Environment

Copy `.env.example` to `.env` and set local values:

```bash
NODE_ENV=development
DATABASE_URL=postgresql://jarvis:jarvis@localhost:5432/jarvis?schema=public
DIRECT_URL=postgresql://jarvis:jarvis@localhost:5432/jarvis?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-a-long-random-development-secret
API_GATEWAY_PORT=5000
AUTH_SERVICE_PORT=50052
AGENT_SERVICE_PORT=50051
```

Production also requires provider secrets for the completed AI and memory stack, such as LLM API keys and Qdrant connection settings.

### Install Dependencies

```bash
npm install
```

### Generate Prisma Client

```bash
npm run db:generate
```

Equivalent direct command:

```bash
npx prisma generate --schema=./database/prisma/schema.prisma
```

### Run Migrations

```bash
npm run db:migrate:dev
```

For deployed environments:

```bash
npm run db:migrate:deploy
```

### Start the Local Stack

```bash
docker compose up --build
```

The Compose stack starts:

- `postgres` on port `5432`.
- `redis` on port `6379`.
- `api-gateway` on port `5000`.
- `auth-service` on port `50052`.
- `agent-service` on port `50051`.
- `worker-service` as a background daemon.
- `nginx` on port `8080`.

### Run Individual Services

```bash
npm run dev:gateway
npm run dev:auth
npm run dev:agent
npm run dev:worker
```

### Build and Typecheck

```bash
npm run build
npm run typecheck
```

## API Surface

### Public REST

Completed gateway routes:

```http
POST /api/auth/register
POST /api/auth/login
GET  /health
```

Example register request:

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

Example auth response:

```json
{
  "userId": "uuid",
  "token": "jwt-token"
}
```

### WebSocket Events

Client to gateway:

```json
{
  "event": "JARVIS_COMMAND",
  "payload": {
    "userPrompt": "Open YouTube",
    "activeTabUrl": "https://google.com"
  }
}
```

Gateway to client:

```json
{
  "event": "JARVIS_EXECUTE_ACTION",
  "payload": {
    "action": "OPEN_TAB",
    "targetUrl": "https://www.youtube.com",
    "spokenReply": "Opening YouTube."
  }
}
```

## AI Command Safety

The completed agent service does not let the model directly control the browser. The LLM produces a candidate decision inside a controlled LangGraph workflow. The service then validates the result against allowed action schemas.

Safety checks include:

- Only known action names are accepted.
- URL actions must produce valid, normalized URLs.
- Destructive or high-risk actions are rejected by default.
- Ambiguous user intent returns clarification instead of execution.
- Active-tab operations require explicit user wording.
- User memory retrieval is scoped by authenticated `userId`.

## Performance Strategy

Jarvis is designed around a low-latency voice experience:

- Speech-to-text and text-to-speech run in the browser to avoid cloud audio round trips.
- The gateway keeps the real-time path short and stateless.
- gRPC/Protobuf reduces internal serialization overhead.
- Redis absorbs non-critical events quickly.
- BullMQ workers move database writes and embeddings out of the request path.
- Prisma queries are isolated to services that own data access.
- Future horizontal gateway scaling can use a Socket.io Redis adapter.

The target is a sub-200ms non-AI routing path where practical. Full AI commands may take longer depending on model latency, retrieval, and summarization complexity.

## Security and Privacy

Security rules for the completed app:

- Never commit `.env` secrets.
- Store passwords only as hashes.
- Verify JWTs before accepting WebSocket commands.
- Keep gateway database-free.
- Scope all history and memory queries by `userId`.
- Validate all model-produced actions before sending them to the extension.
- Keep Chrome extension permissions as narrow as possible.
- Avoid autonomous actions that change external accounts or submit forms.
- Log enough for debugging and auditing without storing unnecessary sensitive content.

## Deployment Model

The planned production deployment uses:

- Containerized services.
- GCP Cloud Run for service hosting.
- Cloud Load Balancing or managed ingress in front of gateway traffic.
- Secret Manager for credentials.
- Memorystore or managed Redis for queues.
- Neon PostgreSQL for relational data.
- Qdrant Cloud for vector memory.
- Cloud Logging/Monitoring for observability.

The same service boundaries used locally are preserved in production.

## Development Phases

| Phase | Goal |
| --- | --- |
| Phase 0 | Define MVP scope, user flows, and acceptance criteria. |
| Phase 1 | Scaffold workspace, Docker, Prisma, Redis, and gRPC contracts. |
| Phase 2 | Build authentication and stateless gateway. |
| Phase 3 | Build Chrome extension command surface. |
| Phase 4 | Add LangGraph AI command engine and Qdrant memory. |
| Phase 5 | Add BullMQ logging, dashboard, and background memory processing. |
| Phase 6 | Add tests, security review, performance checks, and release hardening. |
| Phase 7 | Deploy staging and production environments. |

## Engineering Standards

- Keep service boundaries explicit.
- Prefer contract-first changes for cross-service behavior.
- Add tests around command classification, auth, queues, and extension actions.
- Keep frontend UI accessible, polished, and dark-mode first.
- Use Tailwind utilities instead of raw CSS files.
- Use Radix/Shadcn primitives for accessible UI behavior.
- Use Lucide icons for interface controls.
- Use Framer Motion only for subtle interaction feedback.
- Keep browser extension UI compact and stable to avoid popup resizing issues.

## Useful Commands

```bash
# Install dependencies
npm install

# Build all workspaces
npm run build

# Typecheck all workspaces
npm run typecheck

# Generate Prisma client
npm run db:generate

# Run local Prisma migration
npm run db:migrate:dev

# Deploy migrations
npm run db:migrate:deploy

# Start gateway
npm run dev:gateway

# Start auth service
npm run dev:auth

# Start agent service
npm run dev:agent

# Start worker
npm run dev:worker

# Start full Docker stack
docker compose up --build
```

## Key Files

- `SYSTEM_ARCHITECTURE.md`: deep architecture specification.
- `PLAN.md`: phase-by-phase delivery plan.
- `docs/PHASE_0_MVP.md`: MVP product contract.
- `compose.yaml`: local infrastructure and service stack.
- `database/prisma/schema.prisma`: relational data model.
- `shared/proto/auth.proto`: auth service contract.
- `shared/proto/agent.proto`: agent service contract.
- `.opencode/agent/*.md`: Codex/OpenCode role definitions.

## Summary

Jarvis is a browser assistant platform, not just a chatbot. The extension captures intent and performs browser work, the gateway routes authenticated real-time traffic, the agent service converts language into safe actions, the worker service handles slow persistence, and the data layer stores identity, history, and memory. The architecture is intentionally split so the finished app can stay fast, auditable, and maintainable as features grow.
