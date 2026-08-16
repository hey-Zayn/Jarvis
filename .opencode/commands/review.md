---
description: Automated peer-review pass across Tech Lead, AI Engineer, and Security rules
---

1. Analyze modified code against architectural guidelines in `SYSTEM_ARCHITECTURE.md`.
2. Verify gRPC contracts in `shared/proto/` match server/client code implementations.
3. Check for blocking synchronous code in background workers or WebSocket handlers.
4. Flag any secrets, missing database indexes, or unhandled promise rejections.
