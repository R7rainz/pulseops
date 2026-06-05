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
- `prisma/schema.prisma` — database schema (8 models)
- `prisma.config.ts` — Prisma v7 config (loads dotenv, exports datasource URL)
- `src/server.ts` — entry point (loads dotenv, calls buildApp, listens)
- `src/app.ts` — Fastify bootstrap: CORS, register all routes, start ping engine
- `src/lib/` — db.ts (PrismaClient), jwt.ts (sign/verify HS256), password.ts (bcrypt)
- `src/middleware/` — auth.middleware.ts (Bearer JWT), api-key.middleware.ts (x-api-key header)
- `src/modules/` — auth, workspaces, monitors, incidents, webhooks, status
- `src/workers/` — BullMQ consumers (monitor.worker.ts, webhook.worker.ts)
- `src/schedulers/` — poll-for-due-monitors standalone process

## Auth
- JWT: HS256, 15min expiry, secret from `JWT_SECRET` env var
- Payload: `{ userId: number }`
- `requireAuth` middleware: reads `Authorization: Bearer <token>`, sets `request.user`
- `POST /auth/login` — returns `{user, accessToken}`
- `POST /auth/refresh` — re-signs token ignoring expiry (for frontend auto-refresh)
- API key auth via `x-api-key` header (for heartbeat endpoint)

## Ping Engine (`src/modules/monitors/monitor.engine.ts`)
- Runs every 60s via node-cron (`* * * * *`)
- Fetches all active monitors, pings each in parallel via `Promise.all`
- HTTP ping: native `fetch()` with AbortController timeout
- SSL inspection: parallel `tls.connect()` via `tls.inspector.ts`
- State machine: consecutiveFailures >= graceThreshold → DOWN/DEGRADED
- Creates MonitorCheck records, updates Monitor, opens/resolves Incidents, fires webhooks
- SSL ≤7 days + HTTP up → DEGRADED (not DOWN), creates SSL-specific incident

## Key Endpoints (prefix `/api/v1`)

### Auth
- `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`

### Workspaces
- CRUD at `/workspaces/:id`, API key management at `/:id/api-keys`

### Monitors
- `POST /workspaces/:wsId/monitors`, `GET /workspaces/:wsId/monitors`
- `GET /workspaces/:wsId/monitors/:monitorId` — includes TLS fields
- `GET /monitors/:monitorId/checks` — ping history
- `GET /monitors/:monitorId/stats` — aggregate stats
- `POST /monitors/:monitorId/{pause,resume,check}`

### Incidents
- `GET /workspaces/:wsId/incidents`, `POST /incidents/:id/{acknowledge,resolve}`

### Webhooks
- `POST /workspaces/:wsId/webhooks`, `GET /webhooks/:id/delivery-logs`

### Status (no auth)
- `GET /status/:slug` — public page data + 90-day uptime heatmap

## Prisma Models
- `User`, `Workspace`, `WorkspaceMember`, `Monitor`, `MonitorCheck`, `Incident`, `ApiKey`, `WebhookEndpoint`, `WebhookDeliveryLog`
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

## Scripts
- `pnpm dev` — `tsx watch src/server.ts` (hot-reload)
- `pnpm build` — `tsc` (compiles to `dist/`)
- `pnpm start` — `node dist/server.js`
- `pnpm prisma:dev` — `prisma migrate dev`
- `pnpm prisma:studio` — Prisma Studio GUI
- `pnpm worker:monitor:dev` — BullMQ monitor worker
- `pnpm worker:webhook:dev` — BullMQ webhook worker
- `pnpm scheduler:dev` — interval-based scheduler
- After Prisma schema changes: `prisma db push` (uses `prisma.config.ts`)

## Frontend repo (`../frontend/`)
- Next.js 16 App Router, React 19, Tailwind v4
- `cd frontend && pnpm dev` starts at port 3000
- Server components fetch via `apiFetch()` pointing to backend port 4000
- Auth token: `pulseops_token` httpOnly cookie set by server actions
- Brutalist dark design (zinc-950, emerald accents, border-2, font-mono)
