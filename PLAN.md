# Jarvis AI — Delivery Plan

## What We Are Building

Jarvis is a Chrome extension backed by a web dashboard and AI services. A user speaks or types a request, such as “search YouTube for lo-fi music.” The extension sends the request to Jarvis, Jarvis decides the safe browser action, and the extension performs it and speaks the response. The dashboard lets users manage their account, preferences, and activity history.

## Phase 0 — Agree on the MVP

**Goal:** Decide exactly what the first release does before writing features.

- Define the target user and the top five commands: web search, open a tab, close a tab, summarize a page, and answer from saved preferences.
- Write a user flow and acceptance criteria for every feature. For example: “When a signed-in user says ‘search Google for weather’, a new Google search tab opens and Jarvis confirms the action.”
- Record commands that are *not* in the MVP to avoid scope creep.

**Owners:** Product Manager defines scope; Tech Lead approves technical feasibility.

**Done when:** We have a short MVP feature list, command examples, and clear success criteria.

## Phase 1 — Foundation and Local Development

**Goal:** Make the project runnable on a developer machine.

- Create the TypeScript workspace, package scripts, environment-variable templates, Docker Compose setup, and CI checks.
- Add PostgreSQL/Prisma, Redis, and the initial database models: `User`, `ActionLog`, and `UserMemory`.
- Create `shared/proto/auth.proto` and `shared/proto/agent.proto`. These are the contracts services use to communicate through gRPC.
- Build a minimal NGINX configuration for HTTPS/WebSocket routing.

**Owners:** Backend Engineer and Tech Lead.

**Done when:** `docker-compose up --build` starts the local dependencies and Prisma can generate its client.

## Phase 2 — Identity and Gateway

**Goal:** Allow a user to sign in and connect safely in real time.

- Build `auth-service` for register, login, password hashing (`bcrypt`), and JWT verification.
- Build the stateless `api-gateway` with REST authentication routes and Socket.io connections.
- The gateway validates a user’s JWT through gRPC before accepting commands.

**Important rule:** The gateway never reads or writes the database directly.

**Owners:** Backend Engineer; Security Auditor reviews the result.

**Done when:** A user can register, log in, and establish an authenticated WebSocket connection.

## Phase 3 — Chrome Extension

**Goal:** Give users a working Jarvis control surface in Chrome.

- Create the Manifest V3 extension: popup, background/service worker, and content scripts.
- Add sign-in storage with `chrome.storage.local`.
- Add typed commands first, then voice input with `webkitSpeechRecognition` and spoken replies with `chrome.tts`.
- Implement safe browser actions: open tab, search web, close tab, and summarize the active page.

**Owners:** Extension Engineer, Senior Frontend Engineer, and Design Engineer.

**Done when:** A signed-in user can issue a typed command and see the requested browser action happen.

## Phase 4 — AI Command Engine and Memory

**Goal:** Convert a natural-language command into a reliable, structured action.

- Build `agent-service` using LangGraph and Groq or Gemini.
- Return only deterministic action data defined by `agent.proto`, such as `OPEN_TAB`, `CLOSE_TAB`, or `SUMMARIZE_PAGE`.
- Add Qdrant retrieval for user-specific preferences and memory. Every lookup must be isolated by user ID.
- Validate action data before it is sent back to the extension.

**Owners:** AI/ML Engineer; Tech Lead reviews the gRPC contract and action safety.

**Done when:** Test commands consistently produce valid actions and a spoken response in under the latency target where possible.

## Phase 5 — Background Processing and Dashboard

**Goal:** Add useful history without slowing real-time commands.

- Add BullMQ queues and Redis. The gateway queues audit events immediately; `worker-service` writes logs and embeddings later.
- Build the dashboard for account details, command history, and saved preferences.
- Keep expensive work—logging, analytics, and embedding generation—out of the request path.

**Owners:** Backend Engineer, Senior Frontend Engineer, and Design Engineer.

**Done when:** Commands remain responsive while history appears asynchronously in the dashboard.

## Phase 6 — Quality, Security, and Release

**Goal:** Make the MVP dependable enough for real users.

- Add unit tests for services, integration tests for gRPC and queues, and extension end-to-end tests for core commands.
- Review input validation, authorization, secrets, API limits, error recovery, and database indexes.
- Measure command latency and fix synchronous blockers. The target is a responsive experience, ideally below 200 ms for the non-AI routing path.
- Prepare privacy text and Chrome Web Store listing requirements.

**Owners:** Security & QA Auditor, Tech Lead, and all implementation owners.

**Done when:** Core flows pass tests, security review is resolved, and release notes are ready.

## Phase 7 — Deploy the MVP

**Goal:** Run Jarvis safely in production.

- Deploy containerized services to GCP Cloud Run.
- Use Cloud Load Balancing, Memorystore (Redis), Secret Manager, and Cloud Logging/Monitoring.
- Connect Neon PostgreSQL and Qdrant Cloud using region-aligned, encrypted connections.
- Configure staging first, test the extension against it, then promote the same version to production.

**Done when:** The dashboard and extension work against production services, monitoring is active, and rollback steps are documented.

## Build Order at a Glance

1. Define MVP commands and acceptance criteria.
2. Set up the workspace, database, Redis, Docker, and gRPC contracts.
3. Build authentication and the stateless gateway.
4. Build the extension with typed commands.
5. Add AI orchestration, then voice input and memory.
6. Add queues, activity history, and the dashboard.
7. Test, secure, deploy to staging, then release.

## Rules We Keep Throughout

- Use gRPC/Protobuf for communication between services.
- Keep `api-gateway` stateless and free of direct database access.
- Use BullMQ and Redis for non-critical or long-running operations.
- Version any breaking change to files in `shared/proto/`.
- Never put secrets in source code; use environment variables locally and Secret Manager in production.
