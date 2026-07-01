# PulseOps Backend

## Stack
Fastify v5, Prisma v7 (PostgreSQL), BullMQ + Redis (webhook retries), kafkajs, Zod v4, TypeScript strict.
Part of a monorepo: this dir, `../frontend/` (Next.js), and `../workers/ping-engine/` (Go).

## Quick start
- `pnpm dev` — hot-reload via tsx watch on port 4000 (single process — webhook retry worker, Kafka dispatch scheduler, and metrics consumer all start in-process)
- `pnpm build` — `tsc` to dist/
- `pnpm prisma:dev` — run migrations
- Schema changes: `npx prisma db push` (uses `prisma.config.ts`)
- Automatic monitor checks need Kafka + `../workers/ping-engine` running too — use `docker compose up` at the repo root for the full stack. Without them the API still works, but only the on-demand "check now" button pings anything.

## Architecture
Modules: Routes → Controller → Service → Prisma. Self-contained per `src/modules/<name>/`.

Monitor checks converge on `applyCheckResult()` in `monitor.engine.ts` from two paths:
- **Automatic (production):** `monitor.scheduler.ts` dispatches due monitors to Kafka every 15s → the Go `ping-engine` pings them concurrently and publishes results → `telemetry/metrics.consumer.ts` consumes and applies them.
- **On-demand ("check now"):** `checkMonitor()` pings locally via `fetch()` and applies the result synchronously, bypassing Kafka entirely so it works even if the Go engine is down.

## Key env
- `DATABASE_URL` — postgresql://rainz:brainz@localhost:5432/pulseops
- `JWT_SECRET` — HS256 signing key (64 hex)
- `PORT` — 4000
- `FRONTEND_URL` — CORS allowlist origin(s), comma-separated
- `RAZORPAY_WEBHOOK_SECRET` — required for `/billing/webhook` signature verification
- `KAFKA_BROKERS` / `KAFKA_TARGETS_TOPIC` / `KAFKA_METRICS_TOPIC` — must match `../workers/ping-engine`'s env
- Redis default localhost:6379 for BullMQ (webhook retry queue) and live monitor state cache

## Frontend (`../frontend/`)
Next.js 16 on port 3000, fetches from this API at port 4000.
`pulseops_token` httpOnly cookie for auth, server actions for mutations.
Brutalist dark design system.
