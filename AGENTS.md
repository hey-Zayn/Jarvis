# AGENTS.md – Jarvis Microservices Monorepo Guidelines

You are an AI coding agent working on the Jarvis Voice-Enabled AI Platform. Refer to `SYSTEM_ARCHITECTURE.md` for full design and API specs.

## 🚀 Quick Commands

- **Generate Prisma Client**: `npx prisma generate --schema=./database/prisma/schema.prisma`
- **Run Local Stack**: `docker-compose up --build`
- **Run API Gateway**: `cd services/api-gateway && npm run dev`
- **Run Auth Service**: `cd services/auth-service && npm run dev`
- **Run Agent Service**: `cd services/agent-service && npm run dev`

## ⚙️ Core Architecture Rules

1. **Stateless Gateway:** `api-gateway` routes traffic to microservices via gRPC and pushes async events to Redis. No direct DB access in gateway.
2. **Binary IPC:** Inter-service calls must use Protobuf contracts in `shared/proto/`.
3. **Async Queues:** Non-critical database writes must go through BullMQ + Redis to keep voice latency < 200ms.

# AGENTS.md – Global Tech Stack & Design System Standards

## 🎨 Mandatory Frontend Tech Stack

- **Framework:** React + Vite + TypeScript
- **Styling:** Tailwind CSS (Strictly utility-first, no raw `.css` files)
- **Component Primitives:** Radix UI primitives / Shadcn UI (Headless & accessible)
- **Icons:** Lucide React (`lucide-react`)
- **Animations:** Framer Motion (`framer-motion`) for smooth, subtle UI transitions
- **State Management:** Zustand

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
