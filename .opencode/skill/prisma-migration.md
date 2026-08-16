---
name: prisma-migration
description: Safe workflow to update database schema and regenerate Prisma client
---

## Steps

1. Make necessary updates to `database/prisma/schema.prisma`.
2. Run validation check:
   ```bash
   npx prisma validate --schema=./database/prisma/schema.prisma
   ```
