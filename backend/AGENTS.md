# PulseOps Backend — Agent Context

## Stack
- Fastify v5.8, TypeScript 6 strict, Node 22+
- Prisma v7 (PostgreSQL via `@prisma/adapter-pg`)
- BullMQ v5 + ioredis (job queues)
- Zod v4 for validation
- jsonwebtoken + bcryptjs for auth
- node-cron for ping scheduler
- axios for HTTP requests
- pnpm (monorepo workspace root at repo base)

## Architecture Pattern
Routes → Controller → Service → Prisma
- Controllers: HTTP req/res handling, Zod parsing, status codes
- Services: business logic + DB access (Prisma queries)
- Each module self-contained in `src/modules/<name>/`

## Project Structure
- `prisma/schema.prisma` — database schema (User, Workspace, WorkspaceMember, Monitor, MonitorCheck, Incident, ApiKey, WebhookEndpoint, WebhookDeliveryLog, WorkspaceInvite). Billing fields live inline on `Workspace` (`planTier`, `razorpayCustomerId`, `razorpaySubId`, `subscriptionStatus`) — there is no separate `Subscription` model.
- `prisma.config.ts` — Prisma v7 config (loads dotenv, exports datasource URL)
- `src/server.ts` — entry point (loads dotenv, calls buildApp, listens)
- `src/app.ts` — Fastify bootstrap: CORS, rate limiting, global error handler, health check, registers all routes, starts the ping engine + webhook retry worker
- `src/lib/` — db.ts (PrismaClient), jwt.ts (sign/verify HS256), password.ts (bcrypt), redis.ts (ioredis client)
- `src/middleware/` — auth.middleware.ts (Bearer JWT), api-key.middleware.ts (x-api-key header), rbac.middleware.ts (workspace role checks)
- `src/modules/` — auth, workspaces, monitors, incidents, webhooks, billing, status
- `src/workers/` — `webhook.worker.ts` exports `startWebhookRetryWorker()`, a BullMQ consumer for failed webhook delivery retries. Started automatically from `app.ts` — no separate process needed.

## Auth
- JWT: HS256, 15min expiry, secret from `JWT_SECRET` env var
- Payload: `{ userId: number }`
- `requireAuth` middleware: reads `Authorization: Bearer <token>`, sets `request.user`
- `POST /auth/login` — returns `{user, accessToken}`
- `POST /auth/refresh` — re-signs token ignoring expiry (for frontend auto-refresh)
- API key auth via `x-api-key` header (for heartbeat endpoint)

## Ping Engine (`src/modules/monitors/monitor.engine.ts`)
This is the single source of truth for monitor checks — there is no separate queue/broker pipeline.
- `checkMonitor(monitor)` — runs one full check (HTTP + TLS + state machine + incidents + webhooks + Redis live-state) for a single monitor. Exported so it can be reused.
- `startPingEngine()` — node-cron job (`* * * * *`, every 60s) that fetches all active monitors and calls `checkMonitor` on each in parallel via `Promise.all`. Started from `app.ts`.
- The "run check now" button (`POST /workspaces/:wsId/monitors/:monitorId/check`) calls `checkMonitor` directly and returns the result synchronously — no queue involved.
- HTTP ping: native `fetch()` with AbortController timeout
- SSL inspection: parallel `tls.connect()` via `tls.inspector.ts`
- State machine: consecutiveFailures >= graceThreshold → DOWN/DEGRADED
- Creates MonitorCheck records, updates Monitor, opens/resolves Incidents, fires webhooks
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

## Scripts
- `pnpm dev` — `tsx watch src/server.ts` (hot-reload)
- `pnpm build` — `tsc` (compiles to `dist/`)
- `pnpm start` — `node dist/server.js`
- `pnpm prisma:dev` — `prisma migrate dev`
- `pnpm prisma:studio` — Prisma Studio GUI
- After Prisma schema changes: `prisma db push` (uses `prisma.config.ts`)
- Single process — `pnpm dev` / `pnpm start` is all you need. The ping engine and webhook retry worker start in-process; there are no separate worker/scheduler processes to run.
- Deploys: run `npx prisma migrate deploy` against `DATABASE_URL` as a release step (CI/CD) before rolling out a new image — it is not run automatically by the Dockerfile or at container start.

## Frontend repo (`../frontend/`)
- Next.js 16 App Router, React 19, Tailwind v4
- `cd frontend && pnpm dev` starts at port 3000
- Server components fetch via `apiFetch()` pointing to backend port 4000
- Auth token: `pulseops_token` httpOnly cookie set by server actions
- Brutalist dark design (zinc-950, emerald accents, border-2, font-mono)
