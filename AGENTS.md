# AGENTS.md – Jarvis Microservices Monorepo Guidelines

You are an AI coding agent working on the Jarvis Voice-Enabled AI Platform. Refer to `SYSTEM_ARCHITECTURE.md` for complete system designs and API contracts.

---

## 👥 Agent Roster & Team Hierarchy

- **`@ceo`**: Sets vision, strategic alignment, product-market fit, core value proposition, and scope validation.
- **`@project-manager`**: Manages execution timelines, sprint phases, task ordering, and cross-agent dependencies.
- **`@product-manager`**: Defines feature specifications, PRDs, user flows, stories, and acceptance criteria.
- **`@tech-lead`**: System architect; enforces gRPC contracts, performance budgets, design patterns, and code quality.
- **`@design-engineer`**: Owns UI/UX systems, design tokens, responsive layouts, micro-interactions, and visual polish.
- **`@senior-frontend`**: Implements React apps inside `apps/`, Tailwind CSS styling, state management, and Manifest V3 extension logic.
- **`@senior-backend`**: Builds Node.js microservices inside `backend/services/`, binary gRPC handlers, Prisma ORM queries, and BullMQ queues.
- **`@ai-engineer`**: Orchestrates LangGraph state machines in `agent-service`, prompt tuning, tool calling schemas, and Qdrant RAG vector memory.
- **`@security-auditor`**: Performs read-only code reviews, security scans, vulnerability checks, and performance audits.

---

## 🚀 Quick Commands

- **Generate Prisma Client**: `npx prisma generate`
- **Run Local Stack**: `docker compose up --build`
- **Run API Gateway**: `cd backend/gateway && npm run dev`
- **Run Auth Service**: `cd backend/services/auth-service && npm run dev`
- **Run Agent Service**: `cd backend/services/agent-service && npm run dev`
- **Run Worker Service**: `cd backend/services/worker-service && npm run dev`

---

## ⚙️ Core Backend & Architecture Rules

1. **Stateless Gateway:** `backend/gateway` routes traffic to microservices via gRPC and pushes async events to Redis. No direct DB access in gateway.
2. **Binary IPC:** Inter-service calls must use Protobuf contracts in `shared/proto/`.
3. **Async Queues:** Non-critical database writes (e.g., action logging, analytics) must go through BullMQ + Redis to keep voice response latency under 200ms.
4. **Database Operations:** Execute database operations strictly via Prisma ORM using connection pooling (`DATABASE_URL`).

---

## 🎨 Mandatory Frontend Tech Stack

- **Framework:** React + Vite + TypeScript (located under `apps/`)
- **Styling:** Tailwind CSS (Strictly utility-first, no raw `.css` files)
- **Component Primitives:** Radix UI primitives / Shadcn UI (Headless & accessible)
- **Icons:** Lucide React (`lucide-react`)
- **Animations:** Framer Motion (`framer-motion`) for smooth, subtle UI transitions
- **State Management:** Zustand
- **Extension Auth:** Store and read JWT credentials exclusively using `chrome.storage.local`. Do NOT use DOM cookies or `js-cookie` inside extension service workers.

---

## 📐 Industrial / High-End Design Guidelines (Non-Negotiable)

When generating or editing UI components, DO NOT build simple "vibe code" or generic layouts. Follow these industrial standards:

1. **Apple & Linear Aesthetic:**
   - Use clean, dark-mode first design tokens (`bg-zinc-950`, `text-zinc-100`, `border-zinc-800`).
   - Subtle background blurs (`backdrop-blur-md`, `bg-zinc-900/50`).
   - Micro-borders with subtle glow states (`border border-white/10 hover:border-white/20`).

2. **Typography & Spacing:**
   - Use crisp, clean sans-serif typography (`Inter` or system-ui).
   - Strict spacing rhythm using Tailwind spacing scales (`gap-2`, `gap-4`, `p-4`, `p-6`). Never use random pixel values.

3. **States & Feedback:**
   - Every button/card MUST have active, focus-visible, and disabled states.
   - Use loading skeletons (`animate-pulse`) instead of basic "Loading..." text spinners.
   - Incorporate smooth micro-interactions via Framer Motion for opening modals and tabs.
