# pulseops

**PulseOps in your terminal.** `pulseops` is two things in one install:

- a **scriptable CLI** — your monitors, live status, check history,
  uptime/latency stats, SLA analytics and incident history as readable tables
  for humans, or `--json` for scripts and pipelines; and
- a **live TUI dashboard** — a full-screen, keyboard-driven view of your fleet
  with latency graphs, an availability strip, a status heatmap and six themes.
  Just run `pulseops` with no command.

It's a thin, typed wrapper over the [programmatic API](../docs)'s
key-authenticated **read** surface (plus the heartbeat push endpoint), so
anything you can see in the web dashboard you can also script or watch live.

```bash
npm install -g pulseops
pulseops login        # sign in through your browser
pulseops              # open the live dashboard
pulseops monitors ls  # …or run a command
```

---

## Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [The dashboard](#the-dashboard)
- [Quick start](#quick-start)
- [Authentication](#authentication)
- [Configuration](#configuration)
- [Command reference](#command-reference)
- [Output formats](#output-formats)
- [Exit codes](#exit-codes)
- [Automation recipes](#automation-recipes)
- [Troubleshooting](#troubleshooting)
- [Keeping types in sync with the API](#keeping-types-in-sync-with-the-api)
- [Project layout](#project-layout)
- [Related packages](#related-packages)

---

## Requirements

- **Node.js ≥ 18** (uses the built-in global `fetch`; developed and tested on Node 22)
- **pnpm** (the repo's package manager) to install and build
- A **workspace API key** — create one in the PulseOps dashboard under
  **Settings → API Keys**. v1 keys are **read-only**.

---

## Installation

From npm (recommended):

```bash
npm install -g pulseops   # or: pnpm add -g pulseops
pulseops --help
```

### From the repository

```bash
cd cli
pnpm install
pnpm build          # compiles TypeScript to dist/
node dist/index.js --help
# optionally expose `pulseops` on your PATH:
npm link
```

### Run from source during development

```bash
pnpm dev -- monitors list      # runs src/ directly, no build step
pnpm dev                       # opens the dashboard from source
```

Throughout this document the command is written as `pulseops`. If you haven't
installed it globally, substitute `node dist/index.js` (e.g.
`node dist/index.js monitors list`).

---

## The dashboard

Run `pulseops` with no subcommand (or `pulseops tui` / `pulseops dashboard`) to
open the live terminal dashboard. It reuses your CLI login and honours the same
global flags (`--url`, `--api-key`, `--workspace`).

Three views, switched with the number keys or `Tab`:

- **Overview** — fleet counters (total / up / down / degraded / open incidents /
  average 30-day uptime), a colour-coded status heatmap of every monitor, and
  the most recent incidents.
- **Monitors** — the monitor list beside a rich detail pane: a **braille latency
  graph** over recent checks, an **availability strip**, live stats, latency
  percentiles (p50/p95/p99) and the 30-day SLA block.
- **Incidents** — incident history beside a detail pane with the affected
  monitor and a start → resolve timeline.

Press `t` to cycle themes (Iris, Ember, Matrix, Grape, Nord, Mono) or `T` for a
picker; your choice persists to `~/.config/pulseops/tui.json`. Press `?` for the
full keyboard-shortcut overlay.

| Key                 | Action                                     |
| ------------------- | ------------------------------------------ |
| `1` / `2` / `3`     | Jump to Overview / Monitors / Incidents    |
| `Tab` / `⇧Tab`      | Cycle views                                |
| `j` / `k` (↓ / ↑)   | Move selection                             |
| `gg` / `G`          | Top / bottom of the list                   |
| `Ctrl-d` / `Ctrl-u` | Half-page down / up                        |
| `t` / `T`           | Cycle theme / open theme picker            |
| `?`                 | Toggle the keyboard-shortcut help          |
| `r`                 | Refresh now                                |
| `q` / `Ctrl-C`      | Quit                                       |

---

## Quick start

```bash
# Point at your API (omit to use http://localhost:4000)
export PULSEOPS_API_URL=https://api.pulseops.example.com

# 1. Sign in through your browser — no workspace to configure
pulseops login

# 2. List your monitors (workspace comes from your login)
pulseops monitors list

# 3. Drill into one
pulseops monitors stats 6
pulseops monitors analytics 6

# 4. Check recent incidents
pulseops incidents list
```

---

## Authentication

The CLI supports two ways to authenticate:

### 1. Log in (recommended)

`pulseops login` runs a browser-based device flow (like `gh auth login`): it
prints a short code, opens the PulseOps web app, and you approve there — so it
works with **password, OAuth and 2FA** accounts alike. On success it stores a
session in `~/.config/pulseops/credentials.json` (mode `0600`) and **auto-selects
your workspace**, so you never set `PULSEOPS_WORKSPACE` manually.

```bash
pulseops login          # sign in
pulseops whoami         # show who you are + current workspace
pulseops workspaces     # list your workspaces
pulseops use 42         # switch default workspace (if you have several)
pulseops logout         # sign out and delete stored credentials
```

Access tokens are refreshed automatically; a login lasts until you `logout` or
the session is revoked.

### 2. API key

For CI/scripts, a workspace **API key** is simpler and non-interactive. Keys are
scoped to one workspace, so you set that workspace explicitly. A key
(`--api-key` / `PULSEOPS_API_KEY`) always takes precedence over a stored login.

```bash
export PULSEOPS_API_KEY=po_your_key_here
export PULSEOPS_WORKSPACE=1
pulseops monitors list
```

---

## Configuration

Auth resolves as **`--api-key`/`PULSEOPS_API_KEY` (key mode) → stored `pulseops
login` session**. URL and workspace each resolve **flag → environment variable →
stored login → built-in default**:

| Setting      | Flag                | Environment variable | Default                 | Required                    |
| ------------ | ------------------- | -------------------- | ----------------------- | --------------------------- |
| API base URL | `--url <url>`       | `PULSEOPS_API_URL`   | `http://localhost:4000` | no                          |
| API key      | `-k, --api-key <key>` | `PULSEOPS_API_KEY` | —                       | unless logged in (`pulseops login`) |
| Workspace id | `-w, --workspace <id>` | `PULSEOPS_WORKSPACE` | —                    | key mode only (login auto-selects)  |

Environment variables are the usual way to configure it; flags are handy for
one-offs or overriding a single call:

```bash
# Env for the session
export PULSEOPS_API_KEY=po_xxxxxxxx
export PULSEOPS_WORKSPACE=1
pulseops monitors list

# Or entirely via flags (no env)
pulseops monitors list \
  --url https://api.pulseops.example.com \
  --api-key po_xxxxxxxx \
  --workspace 1
```

### Global options

These apply to every command:

| Flag                   | Description                                                    |
| ---------------------- | ------------------------------------------------------------- |
| `--url <url>`          | API base URL                                                  |
| `-k, --api-key <key>`  | Workspace API key (`po_…`)                                     |
| `-w, --workspace <id>` | Workspace id                                                  |
| `--json`               | Emit the raw API payload as JSON instead of a formatted table |
| `-V, --version`        | Print the CLI version                                         |
| `-h, --help`           | Show help (works on any subcommand too)                       |

> **Colour:** output is colourised only when writing to an interactive
> terminal. It is automatically disabled when the output is piped/redirected or
> when the [`NO_COLOR`](https://no-color.org/) environment variable is set.

---

## Command reference

```
pulseops login                            Sign in through your browser (device flow)
pulseops logout                           Sign out, delete stored credentials
pulseops whoami                           Show the signed-in user + current workspace
pulseops workspaces                       List the workspaces you belong to (alias: ws)
pulseops use <workspaceId>                Set the default workspace for a login session

pulseops monitors list                    List every monitor in the workspace
pulseops monitors get <monitorId>         Show one monitor's config + current state
pulseops monitors live                    Latest cached status/latency for each monitor
pulseops monitors checks <monitorId>      Paginated check history          [--limit --offset]
pulseops monitors stats <monitorId>       Uptime + latency percentiles (all-time / 24h / 30d)
pulseops monitors analytics <monitorId>   30-day SLA summary
pulseops incidents list                   Incidents in the workspace, newest first
pulseops incidents get <incidentId>       One incident, with its monitor
pulseops heartbeat <monitorId>            Push a liveness signal (HEARTBEAT monitors)
```

Command groups have short aliases: **`monitors` → `mon`**, **`incidents` → `inc`**,
**`heartbeat` → `hb`**. Every command accepts `--json` and `--help`.

### `monitors list`

Lists all monitors in the workspace with their current status, URL, last
latency and when they were last checked.

```bash
pulseops monitors list
```

```
ID  NAME                     TYPE  STATUS  URL                              LAST   CHECKED
7   Testing Frontend         HTTP  UP      https://www.youtube.com/         256ms  07-05 15:20
6   HttpBin Production API    HTTP  UP      https://httpbin.org/status/200   1.1s   07-05 15:21
1   Main API Updated         HTTP  DOWN    http://localhost:9999/fail       1ms    07-05 15:21
```

### `monitors get <monitorId>`

Full configuration and latest state for a single monitor (interval, timeout,
expected status, TLS expiry, last response, etc.).

```bash
pulseops monitors get 6
```

### `monitors live`

The latest **cached** status, latency and status code for every active monitor,
read from the live cache (fast, no per-monitor query). Keyed by monitor id.

```bash
pulseops monitors live
```

### `monitors checks <monitorId>`

Paginated history of individual check results (newest first). Shows a
`start–end of total` footer.

| Option            | Default | Description             |
| ----------------- | ------- | ----------------------- |
| `-l, --limit <n>` | `20`    | Rows to return (1–200)  |
| `-o, --offset <n>`| `0`     | Rows to skip            |

```bash
pulseops monitors checks 6 --limit 50
pulseops monitors checks 6 --limit 20 --offset 20   # next page
```

### `monitors stats <monitorId>`

Uptime and latency percentiles (average, p50, p95, p99) computed over all-time,
the last 24 hours and the last 30 days, plus the latest status.

```bash
pulseops monitors stats 6
```

```
latest status  DOWN

METRIC  ALL-TIME  24H     30D
uptime  69.38%    41.57%  64.66%
avg     1.7s      1.7s    1.7s
p95     4.2s      3.5s    4.4s
p99     8.1s      4.9s    8.4s
```

### `monitors analytics <monitorId>`

A 30-day SLA summary: uptime %, number of outages, total downtime in minutes,
and average latency over the last 24 hours.

```bash
pulseops monitors analytics 6
```

### `incidents list`

Every incident in the workspace, newest first, with status, title, the monitor
it belongs to, when it started and how long it lasted.

```bash
pulseops incidents list
```

### `incidents get <incidentId>`

A single incident with its parent monitor and computed duration. Does not
require `--workspace` (incidents are addressed by id).

```bash
pulseops incidents get 552
```

### `heartbeat <monitorId>`

Sends a liveness signal to a **HEARTBEAT**-type monitor, keeping it `UP`. Call
it on your own schedule; a missed heartbeat past the grace period opens an
incident. This is the only non-read command. It targets a monitor by id and is
scoped by the API key's workspace, so it does not take `--workspace`.

```bash
pulseops heartbeat 42
```

> Sending a heartbeat to a non-HEARTBEAT monitor returns a clear `400` error.

---

## Output formats

**Default (human):** aligned, colour-coded tables and key/value blocks sized to
your terminal.

**`--json`:** the raw API response payload, pretty-printed — ideal for scripts.
Read endpoints return a `{ "data": … }` envelope (list endpoints like `checks`
also include a `meta` object with pagination):

```bash
pulseops monitors analytics 6 --json
```

```json
{
  "uptime30Day": 90.4155,
  "totalOutages30Day": 132,
  "downtimeMinutes30Day": 4141,
  "avgLatency24h": 1672
}
```

---

## Exit codes

| Code | Meaning                                                             |
| ---- | ------------------------------------------------------------------ |
| `0`  | Success                                                            |
| `1`  | API or network error (non-2xx response, host unreachable, etc.)    |
| `2`  | Configuration error (missing API key or workspace, invalid value)  |

Errors are printed to **stderr** so they don't pollute `--json` output on stdout.

---

## Automation recipes

```bash
# Fail a CI job if any monitor is currently DOWN
pulseops monitors list --json \
  | jq -e 'all(.[]; .status != "DOWN")' > /dev/null \
  || { echo "A monitor is down"; exit 1; }

# Print just the names of degraded/broken monitors
pulseops monitors list --json \
  | jq -r '.[] | select(.status != "UP") | .name'

# Keep a HEARTBEAT monitor alive from cron (every 5 minutes)
*/5 * * * * PULSEOPS_API_KEY=po_xxx pulseops heartbeat 42

# Poll live status every 10s (simple watch loop)
while true; do clear; pulseops monitors live; sleep 10; done

# Export the last 200 checks for a monitor to a file
pulseops monitors checks 6 --limit 200 --json > checks-6.json
```

---

## Troubleshooting

| Symptom                                                        | Cause & fix                                                                                     |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Error: Not authenticated…` (exit 2)                           | Run `pulseops login`, or set `PULSEOPS_API_KEY` / pass `--api-key`.                              |
| `Error: This command needs a workspace…` (exit 2)              | Logged in with several workspaces: `pulseops use <id>`. Key mode: set `PULSEOPS_WORKSPACE`.      |
| `Your session has expired…`                                    | Run `pulseops login` again.                                                                      |
| `Error: Invalid monitorId: … (expected an integer)` (exit 1)   | Ids are integers — use the numeric id from `monitors list`.                                      |
| `Error: API 401: …`                                            | The key is missing, wrong, or revoked.                                                           |
| `Error: API 403: …`                                            | The key belongs to a different workspace than `--workspace`.                                     |
| `Error: API 404: Monitor not found`                            | No monitor/incident with that id in this workspace.                                             |
| `Error: Could not reach <url>: …` (exit 1)                     | Wrong `--url`/`PULSEOPS_API_URL`, or the API isn't running/reachable.                            |

---

## Keeping types in sync with the API

Request-side types are generated from the live OpenAPI document:

```bash
PULSEOPS_API_URL=http://localhost:4000 pnpm gen   # → src/generated/schema.d.ts
```

The spec does not (yet) carry response schemas, so response models are
hand-authored in [`src/types.ts`](src/types.ts) to mirror the backend's Prisma
models and controllers. If the API's response shapes change, update that file.

---

## Project layout

```
src/
  index.ts           CLI entry — global flags, `tui` command, default dashboard action
  client.ts          Typed fetch client (key or Bearer auth, 401 auto-refresh)
  auth.ts            Device-flow login + token refresh + browser opener
  credentials.ts     Read/write ~/.config/pulseops/credentials.json (0600)
  types.ts           Response models
  config.ts          Auth (key/session) + flag → env → default resolution
  context.ts         Per-command client + config wiring
  format.ts          Tables, colour, status glyphs, date/latency formatting
  commands/          auth.ts · workspaces.ts · monitors.ts · incidents.ts · heartbeat.ts
  tui/               Ink dashboard — launch, root, app, components, charts, themes
  generated/         schema.d.ts (from `pnpm gen`)
```

The dashboard is lazy-loaded: `pulseops <subcommand>` never imports Ink/React,
so plain CLI use stays fast. Run `pnpm smoke` to render it headlessly against a
mock client (no backend needed).

---

## Related packages

The client is reused by a sibling package:

- **[`@pulseops/mcp`](../mcp)** — a Model Context Protocol server that exposes
  the same read API to LLM agents (e.g. Claude Desktop).
```
