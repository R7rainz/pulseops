# PulseOps Backend

## Stack
Fastify v5, Prisma v7 (PostgreSQL), BullMQ + Redis, node-cron, Zod v4, TypeScript strict.

## Quick start
- `pnpm dev` — hot-reload via tsx watch on port 4000 (single process — ping engine + webhook retry worker start in-process, no separate workers to run)
- `pnpm build` — `tsc` to dist/
- `pnpm prisma:dev` — run migrations
- Schema changes: `npx prisma db push` (uses `prisma.config.ts`)

## Architecture
Modules: Routes → Controller → Service → Prisma. Self-contained per `src/modules/<name>/`.
Ping engine (`src/modules/monitors/monitor.engine.ts`) runs every 60s via node-cron in the server process; its `checkMonitor()` is also reused for on-demand "check now" requests. This is the only check pipeline — no Kafka/BullMQ scheduler.

## Key env
- `DATABASE_URL` — postgresql://rainz:brainz@localhost:5432/pulseops
- `JWT_SECRET` — HS256 signing key (64 hex)
- `PORT` — 4000
- `FRONTEND_URL` — CORS allowlist origin(s), comma-separated
- `RAZORPAY_WEBHOOK_SECRET` — required for `/billing/webhook` signature verification
- Redis default localhost:6379 for BullMQ (webhook retry queue) and live monitor state cache

## Frontend (`../frontend/`)
Next.js 16 on port 3000, fetches from this API at port 4000.
`pulseops_token` httpOnly cookie for auth, server actions for mutations.
Brutalist dark design system.
