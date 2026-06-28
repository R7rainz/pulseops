# PulseOps Frontend — Agent Context

## Stack
- Next.js 16 App Router, React 19, TypeScript strict
- Tailwind CSS v4 (CSS-first config via `@import "tailwindcss"` in globals.css)
- Shadcn/ui v4 (`radix-sera` style, `taupe` base)
- Recharts for charts, Lucide for icons
- pnpm (monorepo workspace root at repo base)

## Design System (Brutalist / "Reactor Vibe")
- `bg-zinc-950` dark backgrounds, `border-2` heavy borders, `font-mono` everywhere
- Uppercase `tracking-widest` labels, `text-[10px]` for field labels
- Emerald-500 (`#34d399`) for UP/success, red-500 for DOWN/error, amber-500 for DEGRADED/warning, cyan-500 for accent
- Offset shadow on panels: `shadow-[8px_8px_0px_0px_rgba(34,211,238,0.05)]`
- Use `cn()` from `lib/utils.ts` (clsx + tailwind-merge) for conditional classes
- No shadcn/ui for diagnostics panels/status boxes — hand-rolled brutalist components
- Icons always inline with text, gap-2, small sizes (w-3.5/h-3.5, w-4/h-4)

## Auth
- Token stored in `pulseops_token` httpOnly cookie (set by server actions, 7-day maxAge)
- Middleware (`middleware.ts`) protects `/workspaces/*`, redirects to `/login`
- Server components: get token via `cookies().get("pulseops_token")?.value`
- On 401/403 from `apiFetch`, redirect to `/login`

## Data Fetching
- **Server components:** `apiFetch(url, { token, cookieStore, cache: "no-store" })` from `lib/apiFetch.ts` (auto-refreshes JWT on 401 via `POST /api/v1/auth/refresh`, retries once)
- **Client mutations:** Server actions with `"use server"`, colocated in `actions.ts` per route
- **Client reads:** `apiGet/Post/Patch/Delete` from `lib/api.ts` (for client-side fetches, e.g. incident actions)
- Toast feedback: server action sets `pulseops_toast` cookie (JSON `{message, type}`, maxAge 5s), `<Toast/>` client component reads & auto-dismisses
- Dynamic route params: `params: Promise<...>` — must await before use

## Backend API (at `http://127.0.0.1:4000/api/v1`)

### Auth
- `POST /auth/signup` — create user {name, email, password}, returns {user, accessToken}
- `POST /auth/login` — returns {user, accessToken}
- `POST /auth/refresh` — re-signs token ignoring expiry
- `GET /auth/me` — current user
- `PATCH /auth/me` — update name, email, or password
- `POST /auth/forgot-password` — sends reset link via SMTP
- `POST /auth/reset-password` — reset password with token

### Workspaces
- `POST /workspaces` — create
- `GET /workspaces` — list user's
- `GET /workspaces/:id` — get one (includes role, planTier)
- `PATCH /workspaces/:id` — update
- `DELETE /workspaces/:id` — delete
- `GET /workspaces/:id/members` — list members with roles
- `PATCH /workspaces/:id/members/:userId` — update member role (ADMIN, MEMBER, VIEWER)
- `DELETE /workspaces/:id/members/:userId` — remove member
- `POST /workspaces/:id/api-keys` — create API key
- `GET /workspaces/:id/api-keys` — list
- `DELETE /workspaces/api-keys/:keyId` — revoke
- `GET /workspaces/:id/invites` — list pending invites
- `POST /workspaces/:id/invites` — create invite
- `DELETE /workspaces/:id/invites/:inviteId` — revoke invite

### Monitors
- `POST /workspaces/:wsId/monitors` — create
- `GET /workspaces/:wsId/monitors` — list
- `GET /workspaces/:wsId/monitors/live` — live state from Redis cache (polled every 5s by frontend)
- `GET /workspaces/:wsId/monitors/:monitorId` — get one (includes TLS fields)
- `POST /workspaces/:wsId/monitors/:monitorId/check` — on-demand ping (enqueues BullMQ job)
- `GET /workspaces/:wsId/monitors/:monitorId/checks` — ping history
- `GET /workspaces/:wsId/monitors/:monitorId/stats` — {totalChecks, upChecks, downChecks, uptimePercentage, averageResponseTimeMs, latestStatus}
- `GET /workspaces/:wsId/monitors/:monitorId/analytics` — uptime heatmap + daily aggregates
- `POST /workspaces/:wsId/monitors/:monitorId/pause`
- `POST /workspaces/:wsId/monitors/:monitorId/resume`
- `PATCH /workspaces/:wsId/monitors/:monitorId` — update config
- `DELETE /workspaces/:wsId/monitors/:monitorId`
- `POST /monitors/:monitorId/heartbeat` — external push (API key auth, no workspace prefix)

### Incidents
- `GET /workspaces/:wsId/incidents` — list
- `GET /incidents/:incidentId` — get one
- `POST /incidents/:incidentId/acknowledge`
- `POST /incidents/:incidentId/resolve`

### Webhooks
- `POST /workspaces/:wsId/webhooks` — register (name, url, events[])
- `GET /workspaces/:wsId/webhooks` — list
- `PATCH /workspaces/:wsId/webhooks/:whId` — update (name, url, events)
- `DELETE /workspaces/:wsId/webhooks/:whId` — remove
- `POST /workspaces/:wsId/webhooks/:whId/toggle` — enable/disable
- `POST /workspaces/:wsId/webhooks/:whId/test` — send test ping
- `GET /workspaces/:wsId/webhooks/:whId/delivery-logs` — paginated delivery history

### Invites
- `GET /invites/:token` — get invite details
- `POST /invites/:token/accept` — accept invite

### Billing
- `POST /workspaces/:wsId/subscription` — create Razorpay subscription
- `POST /workspaces/:wsId/subscription/verify` — verify Razorpay payment

### Status (public, no auth)
- `GET /status/:slug` — public status page data (monitors, systemState, 90-day uptime heatmap)

## Shared Types (`lib/types.ts`)
- `MonitorStatus: "UP" | "DOWN" | "DEGRADED" | "PAUSED"`
- `WorkspaceRole: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"`
- `Monitor`, `MonitorCheck`, `MonitorStats`, `MonitorLive`, `Incident`, `WebhookEndpoint`, `WebhookDeliveryLog`
- `ApiResponse<T>`, `CreateMonitorInput`, `UpdateMonitorInput`

## Project Structure
- `app/(auth)/` — login/signup (no sidebar)
- `app/(dashboard)/` — authenticated pages with `<Sidebar>` layout
- `components/` — shared components (`ui/` for shadcn, rest are custom)
- `lib/` — utilities (`apiFetch.ts`, `api.ts`, `types.ts`, `utils.ts`)
- Client components use `"use client"` — needed for hooks, browser APIs, event handlers
- Server components default — for data fetching and layout

## Key Scripts
- `pnpm dev` — `next dev`
- `pnpm build` — `next build`
- `pnpm lint` — `eslint` (flat config)
