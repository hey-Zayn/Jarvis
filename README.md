# Jarvis: The Voice-First AI Agent Platform

Jarvis is an ultra-low-latency, voice-enabled AI platform engineered for real-time interaction, background action execution, and seamless browser extension workflows.🚀

## Core Platform Functionality

- **Sub-200ms Voice Agent Loop**: Processes real-time audio input and streams synthesized voice responses back with minimal latency.
- **Contextual Memory & RAG**: Retains user context, past conversations, and relevant documents using vector memory storage.
- **Asynchronous Task Execution**: Handles long-running or background tasks (like third-party API syncs and action logging) via queues without blocking the primary voice conversation.
- **Browser Extension Integration**: Interacts directly with browser tabs, permitting page summarization, context extraction, and hands-free navigation.
- **Multi-Service Security & Auth**: Manages stateful user authentication across client apps and microservices while keeping client credentials secure.

## Technical Stack Overview

| Domain                      | Technology                     | Key Usage / Implementation                                                      |
| --------------------------- | ------------------------------ | ------------------------------------------------------------------------------- |
| **Frontend Apps**           | React + Vite + TypeScript      | High-performance, single-page client applications located in apps/.             |
| **Styling & Design System** | Tailwind CSS + Radix / Shadcn  | Dark-first, utility-only design tokens (bg-zinc-950, micro-borders).            |
| **Animations & Icons**      | Framer Motion + Lucide React   | Micro-interactions, spring transitions, smooth tab/modal animations.            |
| **State & Auth**            | Zustand + chrome.storage.local | Lightweight client state management; secure token storage for extensions.       |
| **API Gateway**             | Node.js Gateway + NGINX        | Reverse proxy routing and stateless request processing.                         |
| **Inter-Service IPC**       | gRPC + Protocol Buffers        | Binary IPC across services defined in shared/proto/.                            |
| **Microservices**           | Node.js Microservices          | Discrete backend services (agent-service, auth-service, worker-service).        |
| **Database & ORM**          | PostgreSQL + Prisma ORM        | Relational data persistence accessed via pooled database connections.           |
| **Queues & Caching**        | Redis + BullMQ                 | Fast event processing and asynchronous task execution.                          |
| **AI Orchestration**        | LangGraph + Qdrant Vector DB   | Complex agent state machine management and RAG memory retrieval.                |
| **Infrastructure**          | Docker + Docker Compose        | Containerized local development and unified stack orchestration (compose.yaml). |

[ User Voice Input / Extension ]
│
▼
┌───────────────────────┐
│ NGINX / API Gateway │ <-- Auth check & gRPC routing
└───────────┬───────────┘
│
▼
┌───────────────────────┐
│ Agent Service │ <-- LangGraph AI Engine & Vector Memory (Qdrant)
└───────────┬───────────┘
│
┌──────┴────────┐
▼ ▼
[ Fast Voice Stream ] [ BullMQ Async Queue ]
(<200ms audio output) │
▼
[ Worker Service ] <-- Async DB Writes & 3rd-Party APIs

Ingestion & Authentication

The user interacts via the React Web App or Manifest V3 Browser Extension using voice commands or UI actions.

Requests hit the NGINX Reverse Proxy and pass into the Stateless API Gateway.

Authentication tokens (JWT stored in chrome.storage.local) are validated without touching the primary database on every request.

Binary IPC via gRPC

The Gateway converts HTTP/WebSocket requests into binary Protobuf gRPC messages.

These gRPC calls route directly to specialized backend services (agent-service, auth-service) with zero JSON overhead.

AI Reasoning & Context Retrieval

The agent-service receives the command and triggers a LangGraph state machine.

If context is needed, it queries Qdrant Vector DB (RAG) to pull relevant user memories, document context, or active browser tab data.

Low-Latency Streaming Output

To keep response times under 200ms, the platform streams synthesized audio back to the client immediately upon token generation.

Asynchronous Background Execution

Non-critical actions (e.g., logging history, running heavy analytics, or syncing third-party tools) are offloaded to BullMQ + Redis.

The worker-service consumes these queued jobs and executes heavy PostgreSQL/Prisma database writes asynchronously in the background.

Based on the Jarvis architecture and system guidelines, Jarvis is built as a real-time, voice-enabled AI workspace assistant. Below is an overview of all its features, capabilities, and functional performance limits.

🎙️ Core Voice & AI Capabilities
Sub-200ms Voice Loop: Delivers low-latency real-time audio interaction, streaming synthesized voice responses back to the user almost instantaneously.

LangGraph Agent State Machines: Powered by complex agent logic to execute multi-step tool calls, structured reasoning, and contextual decision-making.

Qdrant Vector Memory (RAG): Retains long-term contextual memory, document context, and conversation history via vector search.

🧩 Browser Extension Features (Manifest V3)
Context Extraction & Page Summarization: Reads and analyzes the active browser tab's content in real-time to answer questions or summarize lengthy pages.

Hands-Free Navigation: Executes browser actions and context-aware tasks directly from voice commands.

Secure Token Management: Keeps authentication state persistent across tabs using isolated, secure extension storage (chrome.storage.local).

⚙️ Backend & Asynchronous Operations
Stateless gRPC Communication: Uses binary Protocol Buffer contracts across microservices (shared/proto/) to process requests with virtually zero serialization latency.

Background Task Queuing (BullMQ + Redis): Non-critical operations—such as background database persistence, action logging, and analytics—are offloaded to background worker queues so primary voice channels remain uninterrupted.

Pooled Relational Storage: Manages user state, system logs, and transactional records cleanly via Prisma ORM connected to PostgreSQL.

🎨 High-End Industrial UI Design
Apple & Linear Aesthetics: Features a dark-first user interface (bg-zinc-950) equipped with subtle background blurs (backdrop-blur-md) and micro-border glow states.

Smooth Micro-Interactions: Utilizes Framer Motion for spring transitions, tab changes, and modal states.

Accessible Component Primitives: Built on Radix UI and Shadcn primitives to guarantee full keyboard accessibility and screen-reader compliance.
