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

Three views, switched with the number keys or `Tab`:

- **Overview** — a dashboard: fleet counters (total / up / down / degraded /
  open incidents / average 30-day uptime) as stat cards, a colour-coded status
  heatmap of every monitor, and the most recent incidents.
- **Monitors** — live status/latency for every monitor (auto-refreshed from the
  live cache) beside a rich detail pane for the selected one: a **braille
  latency graph** over the last checks, an **availability strip** (one coloured
  block per check), live "now" stats, latency percentiles (p50/p95/p99) and SLA
  over 30 days (uptime bar, outages, downtime).
- **Incidents** — the workspace incident history (newest first) beside a detail
  pane with the affected monitor and a start → resolve timeline.

Long lists scroll within the viewport (`▲/▼ N more`), keeping the selection in
view.

## Themes

Six built-in palettes — **Iris** (default), **Ember**, **Matrix**, **Grape**,
**Nord** and **Mono**. Press `t` to cycle, or `T` to open a picker with live
swatches. Your choice persists to `~/.config/pulseops/tui.json`. Themes re-skin
the accents, bars and graphs; status colours stay semantic (green up / red down
/ yellow degraded) so they always read clearly.

## Install & build

```bash
cd cli && pnpm install && pnpm build   # the TUI depends on cli's dist/
cd ../tui && pnpm install && pnpm build
node dist/index.js
```

During development (no build step): `pnpm dev`.

## Configuration

Launch it and it handles auth for you: if you haven't signed in (via the CLI's
`pulseops login`) and no `PULSEOPS_API_KEY` is set, the TUI shows a **device
login screen** (short code + browser approval), then a **workspace picker** if
you belong to more than one — no `PULSEOPS_WORKSPACE` needed. It shares the CLI's
stored credentials in `~/.config/pulseops/`.

```bash
pulseops-tui        # if linked globally, else: node dist/index.js
```

To use an API key instead (workspace-scoped, non-interactive):

```bash
export PULSEOPS_API_URL=https://api.pulseops.example.com   # default http://localhost:4000
export PULSEOPS_API_KEY=po_xxxxxxxx…
export PULSEOPS_WORKSPACE=1
pulseops-tui
```

## Keys

Navigation is vim-style (arrow keys also work for line movement):

| Key              | Action                                   |
| ---------------- | ---------------------------------------- |
| `1` / `2` / `3`  | Jump to Overview / Monitors / Incidents  |
| `Tab` / `⇧Tab`   | Cycle views                              |
| `j` / `k`        | Move selection down / up (also `↓` / `↑`) |
| `gg` / `G`       | Jump to top / bottom of the list          |
| `Ctrl-d` / `Ctrl-u` | Half-page down / up                    |
| `t`              | Cycle theme                              |
| `T`              | Open the theme picker                    |
| `?`              | Toggle the keyboard-shortcut help        |
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
  index.tsx         entry — resolves env config, renders <App>
  app.tsx           state, polling, keybindings, views, layout
  components.tsx    Header, TabBar, Overview, Monitor/Incident list+detail, overlays, Footer
  charts.tsx        Sparkline, LatencyGraph (braille), StatusStrip, StatusHeatmap, StatCard
  hooks.ts          usePoll (interval + on-demand) and useClock
  format.ts         latency/date/duration formatting, uptime bar, sparkline/braille, windowing
  theme.ts          palettes, status colours, on-disk settings persistence
  theme-context.tsx ThemeProvider + useTheme/useThemeControls
```
