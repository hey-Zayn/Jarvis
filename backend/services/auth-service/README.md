# Auth Service

Owns user registration, login, JWT validation and refresh-token rotation for Jarvis.

## HTTP service endpoints

The service exposes health and direct development endpoints on `HEALTH_PORT` (default `4101`):

- `POST /register`
- `POST /login`
- `POST /verify-token`
- `POST /refresh-token`
- `GET /health`

The gateway should remain the public edge and call the gRPC API on `GRPC_PORT` (default `4001`).

## Security

Passwords use bcrypt with 12 rounds. Access tokens last 15 minutes. Refresh tokens last 7 days, are hashed in PostgreSQL, and rotate after use. Set a unique `JWT_SECRET` of at least 32 characters before using the service.