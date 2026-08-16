# Jarvis MVP — Phase 0 Product Definition

## 1. Project Purpose

Jarvis is a voice-enabled Chrome assistant that helps people complete small browsing tasks without manually navigating several tabs. It is also a portfolio project that demonstrates production-minded full-stack work: a Chrome extension, real-time services, authentication, AI orchestration, asynchronous processing, and cloud deployment.

The project should be honest and useful. We will build a reliable browser assistant first, rather than claiming to be a general-purpose autonomous AI.

## 2. Target User

**Primary user:** A daily Chrome user—such as a student, job seeker, or knowledge worker—who regularly searches the web, opens tabs, and reads online content.

**Example user:** A job seeker researching companies and roles across many tabs. They want to say, “search LinkedIn for junior backend jobs,” “open YouTube,” or “summarize this page,” and get an immediate, understandable result.

## 3. Problem We Solve

Repeated browser navigation is slow and interrupts focus. Jarvis turns simple, explicit voice or typed instructions into visible Chrome actions, while keeping the user in control.

## 4. MVP Promise

After signing in, a user can open the Jarvis extension, type or speak a supported command, see Jarvis perform the requested browser action, and hear or read a concise confirmation.

## 5. Core MVP Features

| Feature | User value | Example command |
| --- | --- | --- |
| Account access | Keeps history and preferences private | Register or sign in |
| Typed commands | Reliable way to use Jarvis from day one | “Search Google for React jobs” |
| Voice commands | Hands-free interaction | “Open YouTube” |
| Web search | Starts research quickly | “Search the web for AWS Cloud Practitioner” |
| Tab opening | Navigates to a named destination | “Open Gmail” |
| Tab closing | Removes the current tab on request | “Close this tab” |
| Page summary | Reduces reading time on the active page | “Summarize this page” |
| Activity history | Lets users review previous actions | Dashboard command history |

## 6. Main User Flow

1. The user installs the Chrome extension and creates an account or signs in.
2. The extension stores the authentication token securely in `chrome.storage.local`.
3. The user opens the extension popup and types or speaks a supported command.
4. The extension sends the command and active-tab context to Jarvis over an authenticated Socket.io connection.
5. Jarvis classifies the request and returns one validated action: `SEARCH_WEB`, `OPEN_TAB`, `CLOSE_TAB`, or `SUMMARIZE_PAGE`.
6. The extension performs the browser action and displays a short result. It speaks the result when voice mode is enabled.
7. Jarvis queues an activity record in the background; the user can later view it in the dashboard.

## 7. Acceptance Criteria

### Authentication

- A new user can register with email and password, then receive a JWT.
- A returning user can sign in.
- Commands from an invalid or expired JWT are rejected.

### Browser Commands

- A typed supported command returns a result or a clear error message.
- “Search the web for [query]” opens a new tab with the encoded query.
- “Open [supported site]” opens the correct destination in a new tab.
- “Close this tab” only closes the active tab after an explicit user command.
- “Summarize this page” returns a concise summary when readable page content is available.
- Unsupported or unclear instructions never trigger a browser action; Jarvis asks for clarification.

### Voice and Feedback

- Voice input can be started and stopped from the extension popup.
- Jarvis displays the recognized command, action result, and failures.
- A successful voice command provides a short spoken confirmation using `chrome.tts`.

### Reliability and Privacy

- The gateway has no direct database access; activity logging is queued through BullMQ and Redis.
- Activity history belongs only to the signed-in user.
- No API keys, passwords, or tokens are committed to the repository.

## 8. Explicitly Out of Scope for the MVP

- Autonomous multi-step browsing, purchases, form submission, or deleting user data.
- Support for every website or every natural-language command.
- Browser support beyond Chrome/Chromium.
- Team accounts, billing, mobile apps, and complex dashboard analytics.
- Long-term conversational memory beyond simple saved preferences and action history.

## 9. Portfolio Success Criteria

The finished project must include a polished demo, setup instructions, architecture diagram, tests for the core command flow, and a deployed staging or production environment. It should clearly show the engineering decisions: Manifest V3 extension design, gRPC contracts, stateless gateway, Redis/BullMQ worker pipeline, Prisma data layer, and AI action validation.

## 10. Phase 0 Decision

Phase 0 is complete when this document is accepted as the MVP contract. The next task is Phase 1: scaffold the TypeScript workspace, local Docker stack, database, Redis, and gRPC contracts.
