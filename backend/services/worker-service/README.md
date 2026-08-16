# Worker Service

The worker service owns background job enqueue contracts for non-blocking Jarvis work.

## Phase 1 changes

- Added `WorkerJobService` gRPC server on `GRPC_PORT` / `PORT` (`4003` by default).
- Moved HTTP health checks to `HEALTH_PORT` (`4103` by default).
- Added structured modules for config, HTTP health routes, gRPC server wiring, controllers, and service logic.
- Added Phase 1 stub handlers for action-log and conversation-persistence enqueue RPCs.

## Structure

- `index.js` starts the gRPC server and HTTP health server.
- `src/config/` contains service configuration.
- `src/grpc/` loads proto contracts and registers the gRPC server.
- `src/controllers/` maps gRPC calls to service methods.
- `src/services/` contains worker job contract stubs for Phase 1.
- `src/http/` exposes `/health`.

## Notes

BullMQ processors, retries, dead-letter handling, and idempotent persistence belong to Phase 6.