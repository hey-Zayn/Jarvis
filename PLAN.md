# Jarvis Build Plan

Jarvis is a voice-first AI agent platform. The product target is an ultra-low-latency assistant that can hear the user, reason over current context and memory, stream a response, and execute background/browser tasks without blocking the real-time voice loop.

This plan is based on:

- `README.md`
- `AGENTS.md`
- `.opencode/agent/ceo.md`
- `.opencode/agent/tech-lead.md`
- `.opencode/agent/backend-engineer.md`
- `.opencode/agent/project-manager.md`
- `.opencode/agent/product-manager.md`
- `.agents/skills/shadcn/SKILL.md`
- `.agents/skills/shadcn/cli.md`
- Current repo structure under `apps/`, `backend/`, `nginx/`, and `compose.yaml`

## Team Readiness

The team is ready to build Jarvis, with clear role boundaries.

| Role | Status | Primary Responsibility For Jarvis |
| --- | --- | --- |
| CEO | Ready | Keep the product focused on the core value: sub-200ms real-time voice assistance. Reject feature creep that delays MVP. |
| Product Manager | Ready | Define user flows, MVP scope, feature priority, and acceptance criteria for every phase. |
| Project Manager | Ready | Sequence phases, track dependencies, and prevent frontend/backend work from starting before contracts are stable. |
| Tech Lead | Ready | Own system architecture, gRPC contracts, service boundaries, latency budgets, and review gates. |
| Backend Engineer | Ready | Build Node.js microservices, gRPC handlers, Prisma data access, BullMQ queues, and low-latency service logic. |
| Frontend/UI Team | Ready By Stack | Build React + Vite app and Manifest V3 extension using Tailwind, Radix/shadcn, Lucide, Framer Motion, and Zustand. |
| AI Engineer | Ready By Architecture | Build LangGraph orchestration, tool calling, RAG memory, and Qdrant retrieval paths. |
| Security Auditor | Ready By Review Gate | Review auth, JWT storage, service-to-service trust, browser extension permissions, secrets, and dependency risks. |

## Current Repository Assessment

The repository currently contains the first backend skeleton:

- `backend/gateway`
- `backend/services/auth-service`
- `backend/services/agent-service`
- `backend/services/worker-service`
- `nginx/nginx.conf`
- `compose.yaml`
- Empty `PLAN.md`

Important gaps to resolve early:

- `shared/proto/` does not exist yet, but all inter-service contracts must be Protobuf/gRPC.
- The gateway currently uses `express-http-proxy`, but the target architecture requires stateless gRPC routing to services.
- Postgres and Qdrant are not yet in `compose.yaml`.
- RabbitMQ is currently in `compose.yaml`, but the agreed architecture uses Redis + BullMQ for async jobs.
- Frontend app and browser extension folders under `apps/` are not yet scaffolded.
- Services are simple Express health stubs and do not yet expose gRPC servers.
- Some service default ports do not match Compose mappings unless `.env` files override them.

## Architecture Target

Jarvis should be built as a JavaScript-first monorepo with these core boundaries:

```text
apps/
  web-app/                 React + Vite Jarvis control surface
  browser-extension/       Manifest V3 voice/context extension

backend/
  gateway/                 Stateless HTTP/WebSocket edge, JWT verification, gRPC client calls
  services/
    auth-service/          Users, auth, sessions, JWT issuing
    agent-service/         Voice command orchestration, LangGraph, RAG, streaming
    worker-service/        BullMQ processors, async persistence, third-party jobs

shared/
  proto/                   Versioned Protobuf contracts
  js/                      Shared generated clients, validation helpers, constants

database/
  prisma/                  Prisma schema, migrations, seed scripts

nginx/
  nginx.conf               Reverse proxy and WebSocket upgrade handling
```

Core infrastructure:

- Node.js JavaScript services
- gRPC + Protobuf for internal IPC
- Express only at public HTTP/WebSocket edges where useful
- Redis + BullMQ for async work
- PostgreSQL + Prisma ORM for relational state
- Qdrant for vector memory
- Docker Compose for local orchestration
- React + Vite frontend
- Tailwind utility-first styling
- shadcn/Radix primitives before custom UI
- Lucide React icons
- Framer Motion micro-interactions
- Zustand client state
- `chrome.storage.local` for browser extension JWT storage

## Product Principles

1. Voice is the primary interaction model.
2. The voice response loop must stay under 200ms for first perceptible feedback.
3. Long-running work must never block the voice loop.
4. Gateway remains stateless and does not query the database.
5. Every internal service boundary must be expressed through `shared/proto/`.
6. Browser extension permissions must stay minimal and explainable.
7. UI should feel industrial, dark-first, dense, and operational rather than like a marketing page.
8. MVP should prove the end-to-end loop before adding broad integrations.

## MVP Definition

The first complete Jarvis MVP should support:

- User signup/login
- JWT-based auth
- Web app voice capture
- Browser extension auth state through `chrome.storage.local`
- Real-time command submission
- Agent text response streaming
- Basic voice output path
- Active tab context extraction from the extension
- Qdrant-backed memory retrieval
- Async action logging through BullMQ
- Conversation history persistence through Prisma
- Docker Compose local stack
- Basic observability through logs, health checks, and latency metrics

## Phase 0: Foundation Audit And Repo Alignment

Owner: Project Manager + Tech Lead  
Support: Backend Engineer

Goals:

- Lock the monorepo structure before feature work.
- Align README, AGENTS rules, Compose, and actual folders.
- Remove architecture drift before code volume grows.

Tasks:

- Create `shared/proto/`.
- Create `database/prisma/`.
- Decide final JavaScript convention for all services and apps.
- Add root-level docs for local development.
- Normalize service ports:
  - Gateway: `5000`
  - Auth service: `4001`
  - Agent service: `4002`
  - Worker service: `4003`
- Replace RabbitMQ plan with Redis + BullMQ only unless a later product requirement proves RabbitMQ is needed.
- Add Postgres and Qdrant to `compose.yaml`.
- Add `.env.example` files for every service.
- Add root scripts if a root `package.json` is introduced.

Acceptance Criteria:

- `docker compose up --build` starts NGINX, gateway, all services, Redis, Postgres, and Qdrant.
- Every service exposes `/health`.
- Ports are consistent between source, Dockerfiles, Compose, and env examples.
- No gateway code imports Prisma or database clients.
- `shared/proto/` exists and is documented as the source of service contracts.

## Phase 1: Protobuf Contracts And Service Boundaries

Owner: Tech Lead  
Support: Backend Engineer, Product Manager

Goals:

- Define stable internal APIs before implementing business logic.
- Prevent breaking service coupling.

Proto files:

- `shared/proto/auth/v1/auth.proto`
- `shared/proto/agent/v1/agent.proto`
- `shared/proto/worker/v1/jobs.proto`
- `shared/proto/common/v1/common.proto`

Initial contracts:

- `AuthService.Register`
- `AuthService.Login`
- `AuthService.VerifyToken`
- `AuthService.RefreshToken`
- `AgentService.StartConversation`
- `AgentService.SendVoiceCommand`
- `AgentService.StreamAgentResponse`
- `AgentService.SaveMemory`
- `AgentService.SearchMemory`
- `WorkerJobService.EnqueueActionLog`
- `WorkerJobService.EnqueueConversationPersist`

Tasks:

- Add gRPC server dependencies to services.
- Add gRPC client dependencies to gateway.
- Add Protobuf generation workflow.
- Version all proto packages as `v1`.
- Add contract tests that validate generated clients load correctly.

Acceptance Criteria:

- Gateway calls auth and agent services through gRPC, not HTTP proxying.
- Services expose gRPC servers on their internal ports.
- Every non-trivial gateway route maps to a proto RPC.
- Proto changes require Tech Lead review.

## Phase 2: Auth, Users, And Security Baseline

Owner: Backend Engineer  
Support: Security Auditor, Product Manager

Goals:

- Establish identity, sessions, and secure client auth.
- Keep auth fast enough for voice workflows.

User Flows:

- New user creates an account.
- Returning user logs in.
- Web app stores access state in app memory plus safe browser storage.
- Extension stores JWT only in `chrome.storage.local`.
- Gateway validates JWT before forwarding protected requests.

Tasks:

- Add Prisma schema for users, sessions, refresh tokens, and audit logs.
- Implement password hashing with `bcryptjs`.
- Implement JWT access tokens and refresh tokens.
- Implement `VerifyToken` gRPC endpoint.
- Add middleware in gateway for protected routes.
- Add auth health and readiness checks.
- Add basic rate limiting at the gateway.

Acceptance Criteria:

- Signup and login return valid access/refresh tokens.
- Gateway can reject invalid JWTs without database access.
- Extension auth design does not use cookies or `js-cookie`.
- Password hashes are never logged.
- Auth tests cover success and failure cases.

## Phase 3: Voice Command Loop MVP

Owner: AI Engineer + Backend Engineer  
Support: Tech Lead, Product Manager

Goals:

- Prove the first real Jarvis loop: command in, response out, under the latency budget.
- Stream partial response as early as possible.

User Flow:

1. User presses voice control in web app or extension.
2. Client captures audio.
3. Client sends audio or transcript to gateway.
4. Gateway validates auth and routes to agent-service.
5. Agent-service creates a conversation turn.
6. Agent-service starts streaming text/audio response.
7. Non-critical logs are queued to BullMQ.

Tasks:

- Implement WebSocket or streaming HTTP edge in gateway.
- Implement `AgentService.SendVoiceCommand`.
- Add a temporary transcript-first path if full speech-to-text is not ready.
- Add response streaming from agent-service to gateway.
- Add latency instrumentation:
  - request accepted
  - auth verified
  - agent started
  - first token
  - stream completed
- Queue conversation persistence rather than writing synchronously.

Acceptance Criteria:

- First agent response chunk is emitted in under 200ms in local happy-path tests with mocked model calls.
- Voice route stays responsive while worker-service is stopped.
- Conversation persistence failure does not break the active voice response.
- Latency metrics are visible in logs.

## Phase 4: LangGraph Agent Orchestration

Owner: AI Engineer  
Support: Backend Engineer, Product Manager

Goals:

- Add real multi-step agent behavior.
- Keep the state machine observable and bounded.

Capabilities:

- Intent classification
- Context retrieval decision
- Tool selection
- Browser context use
- Memory update decision
- Final response generation

Tasks:

- Add LangGraph dependency to agent-service.
- Define agent state schema.
- Build initial graph:
  - receive command
  - enrich context
  - retrieve memory
  - choose action
  - generate response
  - queue side effects
- Add strict tool schemas.
- Add max-step and timeout guards.
- Add structured logs per graph node.

Acceptance Criteria:

- Agent can answer simple commands.
- Agent can decide when memory retrieval is needed.
- Agent does not run unbounded loops.
- Failed tool calls return useful fallback responses.
- Long-running tools are queued instead of blocking the stream.

## Phase 5: Memory And RAG

Owner: AI Engineer + Backend Engineer  
Support: Tech Lead

Goals:

- Give Jarvis durable context without bloating the real-time path.

Data Stores:

- PostgreSQL for users, conversations, messages, actions, documents, and metadata.
- Qdrant for vector embeddings and semantic retrieval.

Tasks:

- Add Qdrant to Compose.
- Define memory models in Prisma.
- Add embedding provider abstraction.
- Implement `SaveMemory`.
- Implement `SearchMemory`.
- Add memory ranking rules.
- Add async memory writes through BullMQ.
- Add privacy controls for deleting memories.

Acceptance Criteria:

- Agent can retrieve relevant previous context.
- Memory writes do not block active response streaming.
- User can delete stored memory.
- Qdrant collection setup is automated in local dev.
- Tests cover save/search/delete memory behavior.

## Phase 6: Worker Service And Async Jobs

Owner: Backend Engineer  
Support: Project Manager, Security Auditor

Goals:

- Move all non-critical work out of the voice path.

Queues:

- `action-log`
- `conversation-persist`
- `memory-write`
- `analytics`
- `third-party-sync`

Tasks:

- Add BullMQ to worker-service.
- Add Redis connection helpers.
- Add queue producers in gateway and agent-service.
- Add queue processors in worker-service.
- Add retry policies and dead-letter handling.
- Add idempotency keys for background jobs.
- Add job metrics.

Acceptance Criteria:

- Worker can process queued logs and conversation persistence.
- Failed jobs retry with bounded backoff.
- Duplicate jobs are idempotent.
- Voice command route remains functional if async jobs are delayed.

## Phase 7: Web App

Owner: Frontend/UI Team  
Support: Product Manager, Tech Lead

Goals:

- Build the Jarvis control surface.
- Prioritize a functional voice workspace over a landing page.

App Screens:

- Login/register
- Voice workspace
- Conversation history
- Memory manager
- Settings
- Service status/debug panel for development

UI Rules:

- Use React + Vite.
- Use JavaScript unless the project later explicitly switches to TypeScript.
- Use Tailwind utility classes.
- Use shadcn/Radix primitives first.
- Use Lucide icons in icon buttons.
- Use Framer Motion for modal, tab, and panel transitions.
- Use Zustand for client state.
- Dark-first visual system: zinc backgrounds, subtle borders, restrained glow states.
- No raw CSS files for app styling beyond Tailwind entry/config requirements.

shadcn Workflow:

- Run `npx shadcn@latest info` after the app is scaffolded.
- Check installed components before adding new ones.
- Use `npx shadcn@latest docs <component>` before composing component APIs.
- Use `npx shadcn@latest add <component> --dry-run` before updating existing components.
- Never overwrite shadcn components without explicit approval.

Acceptance Criteria:

- User can log in.
- User can start a voice/text command.
- Streaming response is visible in the UI.
- Loading states use skeletons or proper pending controls.
- Buttons include focus-visible, disabled, hover, and active states.
- UI has no generic marketing-first landing screen as the primary experience.

## Phase 8: Browser Extension

Owner: Frontend/UI Team  
Support: Backend Engineer, Security Auditor

Goals:

- Make Jarvis useful inside the browser.
- Capture active tab context safely.

User Flows:

- User logs into extension.
- Extension stores JWT in `chrome.storage.local`.
- User asks Jarvis to summarize the current page.
- Extension extracts active tab content with user-appropriate permission.
- Extension sends context to gateway.
- Agent responds with summary or action.

Tasks:

- Scaffold Manifest V3 extension under `apps/browser-extension`.
- Add popup UI.
- Add background service worker.
- Add content script for page context extraction.
- Add secure token read/write helpers around `chrome.storage.local`.
- Add message passing between popup, background, and content scripts.
- Add gateway client.
- Add page summarization command.

Acceptance Criteria:

- Extension never stores JWT in cookies.
- Extension can summarize the active tab.
- Extension permissions are minimal.
- Extension handles logged-out state cleanly.
- Page context extraction failures return a user-safe error.

## Phase 9: Speech Input And Audio Output

Owner: AI Engineer + Frontend/UI Team  
Support: Backend Engineer

Goals:

- Move from transcript-first MVP to real voice-first interaction.

Tasks:

- Add browser microphone capture.
- Add voice activity detection.
- Choose speech-to-text provider or local model strategy.
- Choose text-to-speech provider or local model strategy.
- Stream partial transcripts when possible.
- Stream synthesized audio as soon as possible.
- Add cancel/interrupt support.
- Add input/output device settings.

Acceptance Criteria:

- User can speak a command and receive audible response.
- User can interrupt/cancel an active response.
- First feedback remains under the latency budget where provider/network conditions allow.
- UI shows clear listening, thinking, speaking, and error states.

## Phase 10: Observability, Testing, And Reliability

Owner: Tech Lead + Security Auditor  
Support: Whole Team

Goals:

- Make Jarvis measurable, debuggable, and stable enough for repeated local and staging use.

Tasks:

- Add structured logging.
- Add request IDs across gateway and services.
- Add latency budgets and warnings.
- Add unit tests for service logic.
- Add contract tests for Protobuf clients/servers.
- Add integration tests for gateway to services.
- Add frontend interaction tests.
- Add extension smoke tests.
- Add Docker health checks.
- Add CI workflow.

Acceptance Criteria:

- CI runs lint/tests for changed packages.
- Local health checks report all required services.
- Logs can trace a request from gateway to agent to worker.
- Contract tests fail on incompatible proto changes.
- Security review passes for auth and extension token storage.

## Phase 11: Beta Hardening

Owner: CEO + Product Manager + Tech Lead  
Support: Whole Team

Goals:

- Prepare Jarvis for real user testing.
- Keep scope tight and polish core loops.

Tasks:

- Validate MVP user flows.
- Profile voice latency.
- Optimize hot paths.
- Add graceful degradation when AI providers fail.
- Add memory privacy controls.
- Add account deletion/export basics.
- Add onboarding only where necessary.
- Write deployment runbook.

Acceptance Criteria:

- A new user can sign up, ask a voice question, use tab context, and review history without developer help.
- Core flow succeeds repeatedly in staging.
- Known provider failures have user-safe fallbacks.
- No P0/P1 security issues remain open.

## Team Execution Order

1. Product Manager finalizes MVP user flows and acceptance criteria.
2. Tech Lead defines `shared/proto/` contracts.
3. Backend Engineer converts service stubs to gRPC services.
4. Backend Engineer adds Prisma, Postgres, Redis/BullMQ, and worker processors.
5. AI Engineer builds transcript-first LangGraph flow.
6. Frontend/UI Team builds web voice workspace.
7. Frontend/UI Team builds browser extension.
8. AI Engineer and Frontend/UI Team add full speech input/output.
9. Security Auditor reviews auth, extension storage, service boundaries, and secrets.
10. Project Manager verifies each phase exit criteria before the next phase expands scope.

## Initial Sprint Plan

### Sprint 1: Architecture Correction

- Add `shared/proto/`.
- Add Postgres and Qdrant to Compose.
- Remove or park RabbitMQ from the default stack.
- Normalize ports.
- Add env examples.
- Add basic service readiness endpoints.

### Sprint 2: gRPC And Auth

- Implement auth proto.
- Implement auth-service gRPC server.
- Implement gateway gRPC auth client.
- Add signup/login/verify token.
- Add Prisma user schema.

### Sprint 3: Agent Skeleton

- Implement agent proto.
- Add agent-service gRPC server.
- Add transcript command endpoint.
- Add streaming response skeleton.
- Queue action logs through BullMQ.

### Sprint 4: Web Workspace

- Scaffold `apps/web-app`.
- Initialize Tailwind and shadcn.
- Build login and voice workspace screens.
- Connect to gateway auth and agent routes.
- Display streaming responses.

### Sprint 5: Extension MVP

- Scaffold `apps/browser-extension`.
- Implement `chrome.storage.local` auth.
- Add popup and content script.
- Extract active tab context.
- Send summarize command to Jarvis.

## Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Sub-200ms target is unrealistic with external model/STT/TTS calls | High | Define the target as first local feedback/first stream chunk, mock provider latency in MVP, and measure provider-specific paths separately. |
| Gateway drifts into business logic | High | Keep gateway stateless, forbid Prisma imports, and route business work through gRPC services. |
| Proto contracts change too often | Medium | Version packages as `v1`, require Tech Lead review, and add contract tests. |
| Async jobs accidentally block voice loop | High | Enforce BullMQ for persistence/logging/analytics and test worker outage scenarios. |
| Browser extension over-requests permissions | Medium | Start with minimal active-tab/context permissions and review every permission before release. |
| UI becomes generic or marketing-heavy | Medium | Build the workspace as the first screen and use shadcn primitives with dark operational design. |
| Memory creates privacy risk | High | Add memory delete controls, avoid storing secrets, and log memory writes clearly. |

## Definition Of Done

A phase is done only when:

- User flow works end to end.
- Acceptance criteria are met.
- Tests or smoke checks exist for the changed behavior.
- Logs and errors are understandable.
- Security-sensitive behavior has been reviewed.
- Documentation is updated when commands, ports, contracts, or env vars change.

## Immediate Next Actions

1. Implement Phase 0 architecture alignment.
2. Create `shared/proto/` and draft `auth.proto`, `agent.proto`, and `jobs.proto`.
3. Update `compose.yaml` to include Postgres and Qdrant.
4. Normalize service ports.
5. Convert gateway-service communication from HTTP proxying toward gRPC.
6. Scaffold the web app only after contracts for auth and agent commands are stable.
