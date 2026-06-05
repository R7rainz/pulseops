# PulseOps Frontend

## Stack
Next.js 16 App Router, React 19, Tailwind v4, TypeScript strict. pnpm monorepo.

## Quick start
- `pnpm dev` — local dev server
- `pnpm build` — production build
- `pnpm lint` — ESLint

## Auth & data flow
- `pulseops_token` httpOnly cookie (7-day) — read via `cookies()` in server components
- Server components fetch via `apiFetch(url, { token, cookieStore })` — auto-refreshes JWT on 401
- Mutations via server actions (`"use server"` in `actions.ts`)
- Backend API at `http://127.0.0.1:4000/api/v1/...`

## Design
Brutalist dark: zinc-950 bg, border-2, font-mono, uppercase tracking-widest labels, offset shadows.
emerald-500 = UP/success | red-500 = DOWN/error | amber-500 = DEGRADED/warning | cyan-500 = accent.
Use `cn()` from `lib/utils.ts` for conditional classes.

## Backend repo (`../backend/`)
- Fastify v5, Prisma v7 (PostgreSQL), BullMQ (Redis), node-cron ping engine
- `cd backend && pnpm dev` starts the API at port 4000
- Ping engine runs every 60s — pings active monitors, checks SSL, creates incidents/webhooks
- Prisma needs `prisma db push` after schema changes (uses `prisma.config.ts`)
- Workers: `pnpm worker:monitor:dev` / `pnpm worker:webhook:dev` for BullMQ consumers
