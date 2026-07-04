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
- `JWT_SECRET` — HS256 signing key (64 hex). Also signs 5-min MFA challenge tokens.
- `PORT` — 4000
- `FRONTEND_URL` — CORS allowlist origin(s), comma-separated. First entry is also the OAuth handoff redirect base.
- `APP_URL` — public frontend URL used in emailed reset / magic-link URLs (default http://localhost:3000)
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` — transactional email (invites, password reset, magic links). Unset ⇒ links are logged to console instead (dev-friendly).
- `RAZORPAY_WEBHOOK_SECRET` — required for `/billing/webhook` signature verification
- `KAFKA_BROKERS` / `KAFKA_TARGETS_TOPIC` / `KAFKA_METRICS_TOPIC` — must match `../workers/ping-engine`'s env
- Redis default localhost:6379 for BullMQ (webhook retry queue), live monitor state cache, **OAuth state + one-time handoff codes**

### OAuth (social login) env — each provider is optional; unset ⇒ its button 302s to `/login?error=oauth_unavailable`
- `OAUTH_CALLBACK_BASE` — public backend URL used to build provider redirect URIs (default http://localhost:4000). Register `<base>/api/v1/auth/oauth/<provider>/callback` with each provider.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` / `MICROSOFT_TENANT` (default `common`)

## Auth methods
Password (bcrypt) · OAuth social login (Google/GitHub/Microsoft via `arctic`) · passwordless magic links · TOTP 2FA (`otplib`, with one-time recovery codes). All converge on a revocable **Session** row (opaque refresh token, sha256-hashed): access token is a 15-min JWT, `POST /auth/refresh` reissues it against a live session, `POST /auth/logout` revokes it. `DELETE /auth/me` self-deletes the account (re-confirms password when set; deletes owned workspaces + their data, then cascades sessions/OAuth/recovery codes). See `src/modules/auth/` (`auth`/`oauth`/`mfa`/`magic-link`) and `src/lib/{session,oauth,jwt}.ts`.

## Frontend (`../frontend/`)
Next.js 16 on port 3000, fetches from this API at port 4000.
`pulseops_token` (access) + `pulseops_refresh` (refresh) httpOnly cookies for auth, server actions for mutations.
Brutalist dark design system.
