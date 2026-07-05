# @pulseops/tui

A terminal dashboard for PulseOps — a live, keyboard-driven view of your
monitors and incidents. Built with [Ink](https://github.com/vadimdemedes/ink)
(React for the terminal) on top of the [`@pulseops/cli`](../cli) client, so it
reuses the exact same typed client, config and response types as the CLI and MCP
server.

> **Why Ink, not Bubble Tea / OpenTUI?** Ink runs on plain Node with no native
> dependencies, keeping this package in the monorepo's uniform Node/TypeScript
> toolchain and letting it import `PulseOpsClient` directly. OpenTUI's native
> renderer requires Bun (or Node ≥26.3 with experimental FFI); Bubble Tea is Go
> and couldn't reuse the TypeScript client at all.

## What it shows

- **Monitors** — live status/latency for every monitor (auto-refreshed from the
  live cache), with a detail pane for the selected monitor: SLA over 30 days
  (uptime bar, outages, downtime) and latency percentiles (p50/p95/p99).
- **Incidents** — the workspace incident history, newest first, with duration.

Long lists scroll within the viewport (`▲/▼ N more`), keeping the selection in
view.

## Install & build

```bash
cd cli && pnpm install && pnpm build   # the TUI depends on cli's dist/
cd ../tui && pnpm install && pnpm build
node dist/index.js
```

During development (no build step): `pnpm dev`.

## Configuration

Same environment as the CLI (a workspace is required — the dashboard is scoped
to one):

```bash
export PULSEOPS_API_URL=https://api.pulseops.example.com   # default http://localhost:4000
export PULSEOPS_API_KEY=po_xxxxxxxx…
export PULSEOPS_WORKSPACE=1
pulseops-tui        # if linked globally, else: node dist/index.js
```

## Keys

Navigation is vim-style (arrow keys also work for line movement):

| Key              | Action                                   |
| ---------------- | ---------------------------------------- |
| `j` / `k`        | Move selection down / up (also `↓` / `↑`) |
| `h` / `l`        | Switch pane — `h` Monitors, `l` Incidents |
| `gg` / `G`       | Jump to top / bottom of the list          |
| `Ctrl-d` / `Ctrl-u` | Half-page down / up                    |
| `r`              | Refresh now                              |
| `q` / `Ctrl-C`   | Quit                                     |

Data auto-refreshes: live state every 5s, monitor list every 15s, incidents
every 20s.

## Smoke test

With the env vars set and the backend running:

```bash
node scripts/smoke.mjs
```

Renders the app headlessly via `ink-testing-library` and prints a frame once the
first data load resolves — verifies it mounts and shows real data without a TTY.

## Layout

```
src/
  index.tsx      entry — resolves env config, renders <App>
  app.tsx        state, polling, keybindings, layout
  components.tsx Header, Tabs, MonitorList, DetailPane, IncidentList, Footer
  hooks.ts       usePoll (interval + on-demand) and useClock
  format.ts      latency/date/duration/uptime-bar + viewport windowing
  theme.ts       Iris accent + status colours
```
