# PulseOps Backend

## Stack
Fastify v5, Prisma v7 (PostgreSQL), BullMQ + Redis, node-cron, Zod v4, TypeScript strict.

## Quick start
- `pnpm dev` — hot-reload via tsx watch on port 4000
- `pnpm build` — `tsc` to dist/
- `pnpm prisma:dev` — run migrations
- `pnpm worker:monitor:dev` — BullMQ consumer for on-demand checks
- Schema changes: `npx prisma db push` (uses `prisma.config.ts`)

## Architecture
Modules: Routes → Controller → Service → Prisma. Self-contained per `src/modules/<name>/`.
Ping engine runs every 60s via node-cron in the server process.

## Key env
- `DATABASE_URL` — postgresql://rainz:brainz@localhost:5432/pulseops
- `JWT_SECRET` — HS256 signing key (64 hex)
- `PORT` — 4000
- Redis default localhost:6379 for BullMQ

## Frontend (`../frontend/`)
Next.js 16 on port 3000, fetches from this API at port 4000.
`pulseops_token` httpOnly cookie for auth, server actions for mutations.
Brutalist dark design system.
