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
- `POST /auth/signup` — create user {name, email, password}
- `POST /auth/login` — returns {user, accessToken}
- `POST /auth/refresh` — re-signs token ignoring expiry
- `GET /auth/me` — current user

### Workspaces
- `POST /workspaces` — create
- `GET /workspaces` — list user's
- `GET /workspaces/:id` — get one
- `PATCH /workspaces/:id` — update
- `DELETE /workspaces/:id` — delete
- `POST /workspaces/:id/api-keys` — create API key
- `GET /workspaces/:id/api-keys` — list
- `DELETE /api-keys/:keyId` — revoke

### Monitors
- `POST /workspaces/:wsId/monitors` — create
- `GET /workspaces/:wsId/monitors` — list
- `GET /workspaces/:wsId/monitors/:monitorId` — get one (includes TLS fields)
- `POST /monitors/:monitorId/check` — on-demand ping
- `GET /monitors/:monitorId/checks` — ping history (array of MonitorCheck)
- `GET /monitors/:monitorId/stats` — {totalChecks, upChecks, downChecks, uptimePercentage, averageResponseTimeMs, latestStatus}
- `POST /monitors/:monitorId/pause`
- `POST /monitors/:monitorId/resume`
- `PATCH /monitors/:monitorId` — update config
- `DELETE /monitors/:monitorId`
- `POST /monitors/:monitorId/heartbeat` — external push (API key auth)

### Incidents
- `GET /workspaces/:wsId/incidents` — list
- `GET /incidents/:incidentId` — get one
- `POST /incidents/:incidentId/acknowledge`
- `POST /incidents/:incidentId/resolve`

### Webhooks
- `POST /workspaces/:wsId/webhooks` — register
- `GET /workspaces/:wsId/webhooks` — list
- `DELETE /webhooks/:webhookId` — remove
- `GET /webhooks/:webhookId/delivery-logs` — delivery history

### Status (public, no auth)
- `GET /status/:slug` — public status page data (monitors, systemState, 90-day uptime heatmap)

## Shared Types (`lib/types.ts`)
- `MonitorStatus: "UP" | "DOWN" | "DEGRADED" | "PAUSED"`
- `Monitor`, `MonitorCheck`, `MonitorStats`, `ApiResponse<T>`, `CreateMonitorInput`, `UpdateMonitorInput`

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
