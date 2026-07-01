# PulseOps Backend — Agent Context

## Stack
- Fastify v5.8, TypeScript 6 strict, Node 22+
- Prisma v7 (PostgreSQL via `@prisma/adapter-pg`)
- BullMQ v5 + ioredis (webhook delivery retry queue)
- kafkajs (dispatch/consume monitor checks to/from `workers/ping-engine`, the Go worker in this monorepo)
- Zod v4 for validation
- jsonwebtoken + bcryptjs for auth
- axios for HTTP requests
- pnpm (monorepo workspace root at repo base — sibling dirs: `../frontend/` and `../workers/ping-engine/`)

## Architecture Pattern
Routes → Controller → Service → Prisma
- Controllers: HTTP req/res handling, Zod parsing, status codes
- Services: business logic + DB access (Prisma queries)
- Each module self-contained in `src/modules/<name>/`

## Project Structure
- `prisma/schema.prisma` — database schema (User, Workspace, WorkspaceMember, Monitor, MonitorCheck, Incident, ApiKey, WebhookEndpoint, WebhookDeliveryLog, WorkspaceInvite). Billing fields live inline on `Workspace` (`planTier`, `razorpayCustomerId`, `razorpaySubId`, `subscriptionStatus`) — there is no separate `Subscription` model.
- `prisma.config.ts` — Prisma v7 config (loads dotenv, exports datasource URL)
- `src/server.ts` — entry point (loads dotenv, calls buildApp, listens)
- `src/app.ts` — Fastify bootstrap: CORS, rate limiting, global error handler, health check, registers all routes, connects Kafka, starts the metrics consumer + monitor dispatch scheduler + webhook retry worker
- `src/lib/` — db.ts (PrismaClient), jwt.ts (sign/verify HS256), password.ts (bcrypt), redis.ts (ioredis client), kafka.ts (kafkajs client/producer/consumer)
- `src/middleware/` — auth.middleware.ts (Bearer JWT), api-key.middleware.ts (x-api-key header), rbac.middleware.ts (workspace role checks)
- `src/modules/` — auth, workspaces, monitors, incidents, webhooks, billing, status, telemetry (Kafka metrics consumer)
- `src/workers/` — `webhook.worker.ts` exports `startWebhookRetryWorker()`, a BullMQ consumer for failed webhook delivery retries. Started automatically from `app.ts` — no separate process needed.

## Auth
- JWT: HS256, 15min expiry, secret from `JWT_SECRET` env var
- Payload: `{ userId: number }`
- `requireAuth` middleware: reads `Authorization: Bearer <token>`, sets `request.user`
- `POST /auth/login` — returns `{user, accessToken}`
- `POST /auth/refresh` — re-signs token ignoring expiry (for frontend auto-refresh)
- API key auth via `x-api-key` header (for heartbeat endpoint)

## Monitor Checks — two paths, one shared core

All check outcomes (however they were produced) converge on `applyCheckResult()` in `src/modules/monitors/monitor.engine.ts` — the state machine, DB transaction, incident open/resolve, webhook firing, and Redis live-state write live there exactly once.

**Automatic periodic checks (production path):**
1. `src/modules/monitors/monitor.scheduler.ts` — `startMonitorDispatchScheduler()` polls every 15s for monitors that are due (respecting each monitor's own `intervalSeconds` vs `lastCheckedAt`, plus the maintenance-window/PAUSED rules), and publishes them to `KAFKA_TARGETS_TOPIC` as `{id, url, method, expected_status, timeout_ms, workspace_id}`.
2. `../workers/ping-engine` (Go, sibling dir in this monorepo) consumes that topic, pings each target concurrently via a goroutine worker pool (`CONCURRENT_WORKERS`, default 20-50), captures TLS issuer/expiry inline off the same HTTPS handshake, and publishes a `Result` to `KAFKA_METRICS_TOPIC`.
3. `src/modules/telemetry/metrics.consumer.ts` — `startMetricsConsumer()` consumes that topic, re-fetches the monitor fresh from Postgres (state may have changed since dispatch), converts the Go engine's result into a `PingResult`, and calls `applyCheckResult()`.

This means **Kafka + the ping-engine container must be running for automatic checks to happen** — `connectKafka()` won't crash the API if Kafka is unreachable, it just logs and automatic checks silently stop until it reconnects. Run the full stack via the root `docker-compose.yml` (includes `zookeeper`, `kafka`, `ping-engine`) rather than just `pnpm dev` in isolation.

**On-demand check (`POST /workspaces/:wsId/monitors/:monitorId/check`, the "check now" button):**
Calls `checkMonitor(monitor)` — `performPing()` (a local `fetch()` + `tls.inspector.ts` TLS check) immediately followed by `applyCheckResult()` — and returns the result synchronously in the response. Deliberately bypasses Kafka so it doesn't depend on the Go engine and returns instantly.

- State machine: consecutiveFailures >= graceThreshold → DOWN/DEGRADED
- SSL ≤7 days + HTTP up → DEGRADED (not DOWN), creates SSL-specific incident

## Key Endpoints (prefix `/api/v1`)

### Auth
- `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
- `PATCH /auth/me` — update name, email, or password
- `POST /auth/forgot-password` — sends reset link via SMTP (Gmail App Password)
- `POST /auth/reset-password` — reset with crypto token (SHA256, 1hr expiry)

### Workspaces
- CRUD at `/workspaces/:id`
- `GET /workspaces/:id/members` — list members with roles
- `PATCH /workspaces/:id/members/:userId` — update role
- `DELETE /workspaces/:id/members/:userId` — remove member
- API key management at `/:id/api-keys` + `DELETE /workspaces/api-keys/:keyId`
- Invites: `GET /workspaces/:id/invites`, `POST /workspaces/:id/invites`, `DELETE /workspaces/:id/invites/:inviteId`
- Billing: `POST /subscription`, `POST /subscription/verify`

### Monitors
- `POST /workspaces/:wsId/monitors`, `GET /workspaces/:wsId/monitors`, `GET /workspaces/:wsId/monitors/live`
- `GET /workspaces/:wsId/monitors/:monitorId` — includes TLS fields
- `GET /workspaces/:wsId/monitors/:monitorId/checks` — ping history
- `GET /workspaces/:wsId/monitors/:monitorId/stats` — aggregate stats
- `GET /workspaces/:wsId/monitors/:monitorId/analytics` — uptime heatmap
- `POST /workspaces/:wsId/monitors/:monitorId/{pause,resume,check}`
- `PATCH /workspaces/:wsId/monitors/:monitorId`, `DELETE /workspaces/:wsId/monitors/:monitorId`
- `POST /monitors/:monitorId/heartbeat` — external push (API key auth, no workspace prefix)

### Incidents
- `GET /workspaces/:wsId/incidents`, `POST /incidents/:id/{acknowledge,resolve}`

### Webhooks
- `POST /workspaces/:wsId/webhooks`, `GET /workspaces/:wsId/webhooks`
- `PATCH /workspaces/:wsId/webhooks/:whId`, `DELETE /workspaces/:wsId/webhooks/:whId`
- `POST /workspaces/:wsId/webhooks/:whId/{toggle,test}`
- `GET /workspaces/:wsId/webhooks/:whId/delivery-logs` — paginated delivery history

### Status (no auth)
- `GET /status/:slug` — public page data + 90-day uptime heatmap

### Billing
- `POST /workspaces/:wsId/subscription` — create Razorpay subscription (OWNER only)
- `POST /workspaces/:wsId/subscription/verify` — verify payment signature, upgrades workspace to PRO (OWNER only)
- `POST /billing/webhook` — Razorpay webhook receiver (HMAC-verified against the raw request body, no auth middleware)

## Prisma Models
- `User`, `Workspace`, `WorkspaceMember`, `Monitor`, `MonitorCheck`, `Incident`, `ApiKey`, `WebhookEndpoint`, `WebhookDeliveryLog`, `WorkspaceInvite`
- All foreign keys cascade on delete

## Environment Variables
| Variable | Default |
|---|---|
| `DATABASE_URL` | `postgresql://rainz:brainz@localhost:5432/pulseops` |
| `JWT_SECRET` | 64 hex chars |
| `PORT` | 4000 |
| `HOST` | 0.0.0.0 |
| `REDIS_HOST` | localhost |
| `REDIS_PORT` | 6379 |
| `SMTP_HOST` | smtp.gmail.com |
| `SMTP_PORT` | 587 |
| `SMTP_USER` | Gmail address |
| `SMTP_PASS` | Gmail App Password |
| `RAZORPAY_KEY_ID` | — |
| `RAZORPAY_KEY_SECRET` | — |
| `RAZORPAY_WEBHOOK_SECRET` | — (required for `/billing/webhook` to verify signatures) |
| `FRONTEND_URL` | `http://localhost:3000` — also used as the CORS allowlist (comma-separated for multiple origins) |
| `KAFKA_BROKERS` | `localhost:9092` (comma-separated). `kafka:29092` inside docker-compose. |
| `KAFKA_TARGETS_TOPIC` | `pulseops.monitors.targets` — dispatched to by the scheduler, consumed by `workers/ping-engine` |
| `KAFKA_METRICS_TOPIC` | `pulseops.monitors.metrics` — published by `workers/ping-engine`, consumed by `metrics.consumer.ts` |

`workers/ping-engine` has its own env vars (`KAFKA_CONSUMER_GROUP`, `CONCURRENT_WORKERS`) — see `workers/ping-engine/.env`.

## Scripts
- `pnpm dev` — `tsx watch src/server.ts` (hot-reload)
- `pnpm build` — `tsc` (compiles to `dist/`)
- `pnpm start` — `node dist/server.js`
- `pnpm prisma:dev` — `prisma migrate dev`
- `pnpm prisma:studio` — Prisma Studio GUI
- After Prisma schema changes: `prisma db push` (uses `prisma.config.ts`)
- Single Node process — `pnpm dev` / `pnpm start` is all you need on the TS side (webhook retry worker + Kafka dispatch scheduler + metrics consumer all start in-process, no separate TS worker processes). But for automatic monitor checks to actually run, Kafka and `workers/ping-engine` also need to be up — easiest via `docker compose up` at the repo root. Without them, the API still works, but only the on-demand "check now" button pings anything.
- Deploys: run `npx prisma migrate deploy` against `DATABASE_URL` as a release step (CI/CD) before rolling out a new image — it is not run automatically by the Dockerfile or at container start.

## Frontend repo (`../frontend/`)
- Next.js 16 App Router, React 19, Tailwind v4
- `cd frontend && pnpm dev` starts at port 3000
- Server components fetch via `apiFetch()` pointing to backend port 4000
- Auth token: `pulseops_token` httpOnly cookie set by server actions
- Brutalist dark design (zinc-950, emerald accents, border-2, font-mono)
