# Agent Service

The agent service owns conversation, command, streaming response, and memory RPC contracts.

## Phase 1 changes

- Added `AgentService` gRPC server on `GRPC_PORT` / `PORT` (`4002` by default).
- Moved HTTP health checks to `HEALTH_PORT` (`4102` by default).
- Added structured modules for config, HTTP health routes, gRPC server wiring, controllers, and service logic.
- Added Phase 1 stub handlers for conversation, voice command, streaming response, save memory, and search memory RPCs.

## Structure

- `index.js` starts the gRPC server and HTTP health server.
- `src/config/` contains service configuration.
- `src/grpc/` loads proto contracts and registers the gRPC server.
- `src/controllers/` maps gRPC calls to service methods.
- `src/services/` contains agent contract stubs for Phase 1.
- `src/http/` exposes `/health`.

## Notes

LangGraph orchestration, model calls, Qdrant retrieval, and streaming latency instrumentation are later phases.