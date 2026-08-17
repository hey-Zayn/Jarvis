# Phase 2: Frontend Implementation Plan

## Web App + Browser Extension (Manifest V3)

**Sprint:** 3-4 | **Duration:** 5 Days | **Owner:** Senior Frontend Engineer

---

## Executive Summary

| Aspect | Decision |
|--------|----------|
| **Web App** | `apps/web-app` - React 18 + Vite + TypeScript + Tailwind + Shadcn |
| **Extension** | `apps/browser-extension` - Manifest V3, React popup, background SW, content script |
| **Auth Flow** | JWT from gateway → `chrome.storage.local` (ext) / Zustand + localStorage (web) |
| **UI Standard** | Dark-first (zinc-950), Shadcn primitives, Lucide icons, Framer Motion |
| **API Client** | Axios/Fetch wrapper with auto-refresh, request interceptors |
| **Shared Package** | `@jarvis/shared` - types, API client, validators, token storage interface |

---

## Phase 1: Web App Foundation (Day 1)

### 1.1 Scaffold React + Vite + TypeScript
```bash
cd apps
npm create vite@latest web-app -- --template react-ts
cd web-app
npm install
```

### 1.2 Install Core Dependencies
```bash
# UI & Styling
npm install tailwindcss @tailwindcss/vite postcss autoprefixer
npm install @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-input @radix-ui/react-button @radix-ui/react-card @radix-ui/react-separator @radix-ui/react-toast @radix-ui/react-avatar @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-dialog @radix-ui/react-tooltip
npm install class-variance-authority clsx tailwind-merge lucide-react framer-motion zustand

# Forms & Validation
npm install react-hook-form @hookform/resolvers zod

# Dev tools
npm install -D @types/node typescript eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh
```

### 1.3 Configure Tailwind v4 + Shadcn
```bash
# Initialize Tailwind v4 with Vite plugin
# Configure @tailwindcss/vite in vite.config.ts

npx shadcn@latest init
# ✅ TypeScript
# ✅ Tailwind CSS
# ✅ CSS variables
# ✅ Neutral (zinc) base color
```

### 1.4 Project Structure

#### Web App (`apps/web-app/`)
```
apps/web-app/
├── src/
│   ├── components/
│   │   ├── ui/              # Shadcn components (button, input, card, etc.)
│   │   ├── auth/            # LoginForm, RegisterForm, AuthLayout
│   │   ├── layout/          # Sidebar, Header, VoiceWorkspace
│   │   └── voice/           # VoiceRecorder, StreamingResponse, Waveform
│   ├── lib/
│   │   ├── utils.ts         # cn(), formatters
│   │   ├── api.ts           # Gateway API client (axios)
│   │   ├── auth.ts          # Token storage, refresh logic
│   │   └── validators.ts    # Zod schemas
│   ├── hooks/
│   │   ├── useAuth.ts       # Auth state + actions
│   │   ├── useVoice.ts      # Voice recording + streaming
│   │   └── useConversations.ts
│   ├── store/
│   │   ├── authStore.ts     # Zustand: user, tokens, login/logout
│   │   ├── conversationStore.ts
│   │   └── uiStore.ts       # Sidebar, modals, toasts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Workspace.tsx
│   │   ├── History.tsx
│   │   ├── Memory.tsx
│   │   └── Settings.tsx
│   ├── styles/
│   │   └── globals.css      # Tailwind + custom CSS variables
│   ├── App.tsx
│   ├── main.tsx
│   └── routes.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── components.json          # Shadcn config
```

#### Browser Extension (`apps/browser-extension/`)
```
apps/browser-extension/
├── public/
│   ├── manifest.json
│   ├── icons/ (16, 32, 48, 128)
│   └── popup.html
├── src/
│   ├── popup/
│   │   ├── App.tsx          # React root
│   │   ├── components/
│   │   │   ├── AuthGate.tsx # Redirect to login if no token
│   │   │   ├── VoiceWorkspace.tsx (compact)
│   │   │   └── TabContext.tsx
│   │   └── index.ts
│   ├── background/
│   │   ├── index.ts         # Service worker
│   │   ├── auth.ts          # chrome.storage.local token mgmt
│   │   ├── messaging.ts     # Runtime messaging
│   │   └── contextMenus.ts
│   ├── content/
│   │   ├── index.ts         # Content script
│   │   ├── extractor.ts     # Page text/selection extraction
│   │   └── selector.ts      # DOM selection helpers
│   ├── lib/
│   │   ├── api.ts           # Same gateway client (shared)
│   │   ├── storage.ts       # chrome.storage.local wrapper
│   │   └── messaging.ts     # Type-safe message passing
│   └── styles/
│       └── popup.css        # Tailwind + fixed dimensions
├── package.json
├── tsconfig.json
├── vite.config.ts           # Multi-entry: popup, background, content
└── components.json
```

#### Shared Package (`packages/shared/`)
```
packages/shared/
├── src/
│   ├── api/
│   │   ├── client.ts        # Unified gateway client (axios)
│   │   ├── endpoints.ts     # Typed endpoint definitions
│   │   └── types.ts         # Request/response types
│   ├── auth/
│   │   ├── tokens.ts        # Token storage interface
│   │   └── schemas.ts       # Zod auth schemas
│   ├── voice/
│   │   └── types.ts         # Voice types (transcript, chunks)
│   └── validators/
│       └── common.ts
├── package.json
└── tsconfig.json
```

## Phase 2: Shadcn Component Library (Day 1-2)

### 2.1 Add Required Shadcn Components
```bash
cd apps/web-app
npx shadcn@latest add button input label card separator toast avatar dropdown-menu tabs dialog tooltip form sheet scroll-area skeleton progress
```

### 2.2 Custom Components to Build

| Component | Purpose | Shadcn Base |
|-----------|---------|-------------|
| `AuthLayout` | Centered card with backdrop blur | `Card` + `Separator` |
| `VoiceButton` | Record/stop with waveform animation | `Button` + `framer-motion` |
| `StreamingResponse` | Token-by-token markdown render | Custom + `ScrollArea` |
| `ConversationList` | Virtualized list with skeletons | `ScrollArea` + `Skeleton` |
| `TabContextExtractor` | Extension communication UI | `Dialog` + `Tabs` |

---

## Phase 3: Authentication System (Days 2-3)

### 3.1 API Client (`lib/api.ts`)
```typescript
// Base client with:
// - Auto JWT attachment from store
// - 401 → refresh token → retry
// - Request/response logging (dev)
// - Typed endpoints matching gateway routes

// Endpoints:
// POST   /auth/register
// POST   /auth/login
// POST   /auth/verify-token
// POST   /auth/refresh-token
// GET    /auth/profile
// PATCH  /auth/profile
// POST   /agent/conversations
// POST   /agent/voice-command
// GET    /agent/responses/:conversationId/:turnId (streaming)
// POST   /agent/memory
// GET    /agent/memory/search
// POST   /worker/action-log
// POST   /worker/conversation-persist
```

### 3.2 Auth Store (`store/authStore.ts`)
```typescript
// Zustand store with persist middleware:
// - user: User | null
// - accessToken: string | null
// - refreshToken: string | null
// - isAuthenticated: boolean
// - login(credentials)
// - register(data)
// - logout()
// - refreshAccessToken()
// - hydrate() from localStorage
// - setUser(user)
```

### 3.3 Validators (`lib/validators.ts`)
```typescript
// Zod schemas:
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(1, 'Display name is required').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

### 3.4 Login Page (`pages/Login.tsx`)
**Layout**: `AuthLayout` (centered, max-w-md, backdrop-blur-md, border-white/10)
**Form**: `react-hook-form` + Zod resolver
**Fields**: 
- Email (Input with Label, type=email, autoComplete=email)
- Password (Input with Label, type=password, show/hide toggle, autoComplete=current-password)
**Actions**: 
- Submit → `login()` → redirect to `/workspace`
- Loading state: Button with Spinner, disabled
- Error: Toast (Shadcn Toast)
**Links**: "Create account" → `/register`, "Forgot password" (placeholder)

### 3.5 Register Page (`pages/Register.tsx`)
---

## Phase 4: Voice Workspace (Days 3-4)

### 4.1 Workspace Layout
```
┌─────────────────────────────────────────────────────┐
│  Header: Logo | Conversations | Memory | Settings   │
├──────────────┬──────────────────────────────────────┤
│  Sidebar     │  Main: Voice Workspace               │
│  (Collapse)  │  ┌────────────────────────────────┐  │
│  - History   │  │  Streaming Response Area       │  │
│  - Favorites │  │  (Markdown, auto-scroll)       │  │
│              │  └────────────────────────────────┘  │
│              │  ┌────────────────────────────────┐  │
│              │  │  Voice Input Bar               │  │
│              │  │  [Mic Button] [Text Input]     │  │
│              │  │  [Send] [Context: 📄 Tab]      │  │
│              │  └────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────┘
```

**Components**:
- `Sidebar` - Collapsible (w-64 → w-16), conversation list, new chat button
- `Header` - Logo, navigation tabs, user avatar dropdown
- `VoiceWorkspace` - Main area with response + input
- `StreamingResponse` - Markdown rendering, syntax highlighting, auto-scroll
- `VoiceInputBar` - Mic button (hold/toggle), text input, send, context chip

### 4.2 Voice Recording Hook (`hooks/useVoice.ts`)
```typescript
// Features:
// - webkitSpeechRecognition for transcript (interim + final)
// - MediaRecorder for audio chunks (future STT)
// - Visual waveform via framer-motion + canvas
// - Push-to-talk + VAD modes
// - Returns: { transcript, isRecording, start, stop, reset }
```

### 4.3 Streaming Response
```typescript
// Fetch with ReadableStream for NDJSON
// Parse chunks: { chunk, is_final, conversationId, turnId }
// Token-by-token markdown rendering (react-markdown + remark-gfm)
// is_final → persist to conversationStore
```

---

## Phase 5: Browser Extension (Manifest V3) (Days 4-5)

### 5.1 Extension Structure
```
apps/browser-extension/
├── public/
│   ├── manifest.json
│   ├── icons/ (16, 32, 48, 128)
│   └── popup.html
├── src/
│   ├── popup/
│   │   ├── App.tsx          # React root
│   │   ├── components/
│   │   │   ├── AuthGate.tsx # Redirect to login if no token
│   │   │   ├── VoiceWorkspace.tsx (compact)
│   │   │   └── TabContext.tsx
│   │   └── index.ts
│   ├── background/
│   │   ├── index.ts         # Service worker
│   │   ├── auth.ts          # chrome.storage.local token mgmt
│   │   ├── messaging.ts     # Runtime messaging
│   │   └── contextMenus.ts
│   ├── content/
│   │   ├── index.ts         # Content script
│   │   ├── extractor.ts     # Page text/selection extraction
│   │   └── selector.ts      # DOM selection helpers
│   ├── lib/
│   │   ├── api.ts           # Same gateway client (shared)
│   │   ├── storage.ts       # chrome.storage.local wrapper
│   │   └── messaging.ts     # Type-safe message passing
│   └── styles/
│       └── popup.css        # Tailwind + fixed dimensions
├── package.json
├── tsconfig.json
├── vite.config.ts           # Multi-entry: popup, background, content
└── components.json
```

### 5.2 Manifest V3 (`manifest.json`)
```json
{
  "manifest_version": 3,
  "name": "Jarvis",
  "version": "1.0.0",
  "description": "Voice-first AI assistant in your browser",
  "permissions": ["storage", "activeTab", "scripting", "tabs", "alarms"],
  "host_permissions": ["http://localhost:5000/*", "https://api.jarvis.local/*"],
  "background": { "service_worker": "background/index.js", "type": "module" },
  "action": { 
    "default_popup": "popup.html", 
    "default_icon": "icons/icon-32.png",
    "default_title": "Jarvis"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/index.js"],
    "run_at": "document_idle",
    "all_frames": false
  }],
  "web_accessible_resources": [{
    "resources": ["icons/*"],
    "matches": ["<all_urls>"]
  }],
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```
---

## Phase 6: Shared Package (Day 5)

### 6.1 Create Shared Types/API Package
```
packages/shared/
├── src/
│   ├── api/
│   │   ├── client.ts        # Unified gateway client (axios)
│   │   ├── endpoints.ts     # Typed endpoint definitions
│   │   └── types.ts         # Request/response types
│   ├── auth/
│   │   ├── tokens.ts        # Token storage interface
│   │   └── schemas.ts       # Zod auth schemas
│   ├── voice/
│   │   └── types.ts         # Voice types (transcript, chunks)
│   └── validators/
│       └── common.ts
├── package.json
└── tsconfig.json
```

### 6.2 Install in Both Apps
```bash
cd apps/web-app && npm install @jarvis/shared
cd apps/browser-extension && npm install @jarvis/shared
```

**Note**: Use `file:` protocol or pnpm workspace for local development.

---

## Phase 7: Build & Deploy Config (Day 5)

### 7.1 Vite Config (Web App)
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { 
    alias: { 
      '@': path.resolve(__dirname, './src'),
      '@jarvis/shared': path.resolve(__dirname, '../../packages/shared/src')
    } 
  },
  server: { 
    port: 3000, 
    proxy: { 
      '/api': 'http://localhost:5000',
      '/auth': 'http://localhost:5000',
      '/agent': 'http://localhost:5000',
      '/worker': 'http://localhost:5000',
    } 
  },
### 7.2 Vite Config (Extension)
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { 
    alias: { 
      '@': path.resolve(__dirname, './src'),
      '@jarvis/shared': path.resolve(__dirname, '../../packages/shared/src')
    } 
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        background: 'src/background/index.ts',
        content: 'src/content/index.ts'
      },
      output: { 
        entryFileNames: '[name].js', 
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
});
```

### 7.3 Root Package.json Scripts
```json
{
  "scripts": {
    "dev:web": "cd apps/web-app && npm run dev",
    "dev:ext": "cd apps/browser-extension && npm run dev",
    "build:web": "cd apps/web-app && npm run build",
    "build:ext": "cd apps/browser-extension && npm run build",
    "build:all": "npm run build:web && npm run build:ext",
    "build:shared": "cd packages/shared && npm run build",
    "lint": "npm run lint --workspaces",
    "typecheck": "npm run typecheck --workspaces",
    "test": "npm run test --workspaces"
  }
}
```

---

## Acceptance Criteria Checklist

### Authentication
- [ ] Login page: Dark theme, centered card, validation, toast errors, redirect on success
- [ ] Register page: Same layout, password strength, confirm match, auto-login
- [ ] Token storage: Web (localStorage + Zustand persist), Ext (chrome.storage.local)
- [ ] Auto refresh: 401 → refresh → retry original request (max 1 retry)
- [ ] Protected routes: Redirect to `/login` if no valid token
- [ ] Logout: Clears tokens, redirects to login

### Web App UI
- [ ] Shadcn components: All forms use Shadcn Input/Button/Label/Card/Toast
- [ ] Animations: Framer Motion on modal open, button press, token stream
- [ ] Dark theme: zinc-950 background, border-white/10, backdrop-blur-md
- [ ] Responsive: Sidebar collapse, mobile drawer
- [ ] TypeScript: Strict mode, no `any`, shared types from `@jarvis/shared`

### Voice Workspace
- [ ] Mic button: Hold to record, visual waveform animation
- [ ] Transcript: Real-time interim + final results
- [ ] Streaming: NDJSON chunks render token-by-token with markdown
- [ ] Auto-scroll: New tokens scroll into view
- [ ] Context chip: Shows active tab indicator when extension connected

### Browser Extension
- [ ] Popup: 380x520 fixed, no resize glitch, smooth scroll
- [ ] Auth sync: Login in web app → tokens available in extension
- [ ] Tab Context: "Summarize" extracts page text, sends to agent, streams response
- [ ] Background SW: Token refresh alarm, message routing
- [ ] Content script: Page context extraction, selection capture
- [ ] Manifest V3: All permissions minimal, host_permissions scoped

### Code Quality
- [ ] ESLint: No errors, consistent formatting
- [ ] TypeScript: `npm run typecheck` passes (strict mode)
- [ ] Build: Both apps build without errors
- [ ] Shared package: Types exported and consumed correctly

---

## Execution Order

| Day | Focus | Deliverable |
|-----|-------|-------------|
| **1** | Web app scaffold + Tailwind + Shadcn init | Running `npm run dev` at localhost:3000 |
| **2** | Shadcn components + Auth API + Store | `Login.tsx`, `Register.tsx` functional |
| **3** | Protected routes + Workspace layout | Full auth flow, sidebar, header |
| **4** | Voice workspace + Streaming | Mic button, transcript, NDJSON stream |
| **5** | Extension scaffold + Popup + Background | Loadable in Chrome, auth sync |
| **5** | Content script + Tab context | "Summarize page" working end-to-end |
| **5** | Shared package + Build configs | Both apps build, typecheck, lint pass |

---

## Dependencies & Risks

| Dependency | Status | Mitigation |
|------------|--------|------------|
| Gateway auth endpoints | ✅ Ready | Contract tests passing |
| Gateway agent streaming | ⏳ Sprint 3 | Mock streaming for frontend dev |
| Shared package types | 📝 Day 5 | Define interfaces first |
| Chrome Web Store review | 🔮 Later | Dev mode for MVP |

---

## Definition of Done

Phase 2 is complete when:
1. ✅ Web app runs at `localhost:3000` with full auth flow
2. ✅ Extension loads in Chrome (dev mode) with popup auth
3. ✅ "Summarize page" works end-to-end (popup → content → agent → stream)
4. ✅ Shared package provides types to both apps
5. ✅ All lint, typecheck, build pass
6. ✅ Code reviewed by Tech Lead

---

**Next Phase:** Sprint 4 - Agent Skeleton (Phase 3: Voice Command Loop MVP)
  build: { outDir: 'dist', sourcemap: true }
});
```

### 5.3 Popup (Fixed 380x520)
**popup.html**:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=380, height=520" />
    <title>Jarvis</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/popup/index.ts"></script>
  </body>
</html>
```

**App.tsx**: 
- `AuthGate` checks `chrome.storage.local` for tokens
- Shows `LoginForm` (compact) or `VoiceWorkspace` (compact)
- `TabContext` button: "Summarize this page" → extracts content → sends to agent

### 5.4 Background Service Worker
```typescript
// background/index.ts
// - Token refresh via chrome.alarms (every 10 min)
// - Message routing: popup ↔ content ↔ background
// - Context menu: "Ask Jarvis about selection"
// - Handles chrome.runtime.onMessage for:
//   - GET_CONTEXT → forwards to content script
//   - SEND_COMMAND → calls gateway API
//   - REFRESH_TOKEN → calls auth refresh
```

### 5.5 Content Script
```typescript
// content/extractor.ts
export function extractPageContext(): PageContext {
  return {
    url: window.location.href,
    title: document.title,
    selectedText: window.getSelection()?.toString() || '',
    pageText: document.body.innerText.slice(0, 50000), // Limit size
  };
}

// content/index.ts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'EXTRACT_CONTEXT') {
    sendResponse({ context: extractPageContext() });
  }
  return true; // async response
});
```
**Layout**: Same `AuthLayout` as Login
**Fields**:
- Email (Input, type=email)
- Display Name (Input, maxLength=100)
- Password (Input, type=password, strength meter)
- Confirm Password (Input, type=password, match validation)
**Validation**: Real-time strength meter (zxcvbn or custom), match check
**Action**: `register()` → auto-login → redirect to `/workspace`

### 3.6 Protected Route Wrapper
```tsx
// routes.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hydrate } = useAuthStore();
  useEffect(() => { hydrate(); }, []);
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hydrate } = useAuthStore();
  useEffect(() => { hydrate(); }, []);
  
  if (isAuthenticated) return <Navigate to="/workspace" replace />;
  return <Outlet />;
}
```
│   │   ├── layout/          # Sidebar, Header, VoiceWorkspace
│   │   └── voice/           # VoiceRecorder, StreamingResponse, Waveform
│   ├── lib/
│   │   ├── utils.ts         # cn(), formatters
│   │   ├── api.ts           # Gateway API client (axios)
│   │   ├── auth.ts          # Token storage, refresh logic
│   │   └── validators.ts    # Zod schemas
│   ├── hooks/
│   │   ├── useAuth.ts       # Auth state + actions
│   │   ├── useVoice.ts      # Voice recording + streaming
│   │   └── useConversations.ts
│   ├── store/
│   │   ├── authStore.ts     # Zustand: user, tokens, login/logout
│   │   ├── conversationStore.ts
│   │   └── uiStore.ts       # Sidebar, modals, toasts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Workspace.tsx
│   │   ├── History.tsx
│   │   ├── Memory.tsx
│   │   └── Settings.tsx
│   ├── styles/
│   │   └── globals.css      # Tailwind + custom CSS variables
│   ├── App.tsx
│   ├── main.tsx
│   └── routes.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── components.json          # Shadcn config
```