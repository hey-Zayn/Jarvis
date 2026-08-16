# Protobuf Contracts

This directory is the source of truth for internal Jarvis service contracts.

## Phase 1 contracts

- `common/v1/common.proto` contains shared request context, status, error, and health messages.
- `auth/v1/auth.proto` defines `AuthService` RPCs.
- `agent/v1/agent.proto` defines `AgentService` RPCs, including server-side response streaming.
- `worker/v1/jobs.proto` defines `WorkerJobService` enqueue RPCs.

All packages are versioned as `v1`. Breaking changes require Tech Lead review and an API version strategy.