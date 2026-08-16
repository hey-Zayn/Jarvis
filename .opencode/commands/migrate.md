---
description: Validate, generate, and run Prisma migrations
agent: backend-engineer
---

Run the complete database migration pipeline:
!`npx prisma validate --schema=./database/prisma/schema.prisma`
!`npx prisma generate --schema=./database/prisma/schema.prisma`
!`npx prisma migrate dev --schema=./database/prisma/schema.prisma`
