# API Gateway

The gateway is the public HTTP edge for Jarvis. It must remain stateless and must not import Prisma or any database client.

## Phase 1 changes

- Removed HTTP proxy routing for backend services.
- Added gRPC clients for auth, agent, and worker services.
- Added controller and route modules under `src/` instead of keeping route logic in `index.js`.
- Added contract tests that validate proto files load and gateway clients can be created.

## Structure

- `index.js` starts the HTTP server and wires routes.
- `src/config/` contains environment-driven service configuration.
- `src/grpc/` contains gRPC clients, proto loading, and unary-call helpers.
- `src/controllers/` adapts HTTP requests to gRPC request payloads.
- `src/http/` contains Express routes and error handling.
- `src/utils/` contains request context helpers.

## Commands

- `npm run dev` starts the gateway.
- `npm run test:contracts` validates Phase 1 proto/client loading.