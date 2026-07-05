# @pulseops/cli

Official command-line client for the [PulseOps](../) programmatic API. Wraps the
key-authenticated read surface (monitors, live state, checks, stats, incidents)
and the heartbeat push endpoint, with both human-readable tables and `--json`
for scripting.

## Install

```bash
cd cli
pnpm install
pnpm build      # compiles to dist/
node dist/index.js --help
```

To run without building during development:

```bash
pnpm dev -- monitors list          # node --experimental-strip-types src/index.ts
```

Link it as a global `pulseops` binary if you like:

```bash
pnpm build && npm link              # then: pulseops monitors list
```

## Configuration

Every request needs a workspace API key (create one in **Settings → API Keys**;
v1 keys are read-only). Settings resolve **flag → environment → default**:

| Setting     | Flag              | Env                  | Default                 |
| ----------- | ----------------- | -------------------- | ----------------------- |
| API base URL| `--url`           | `PULSEOPS_API_URL`   | `http://localhost:4000` |
| API key     | `-k, --api-key`   | `PULSEOPS_API_KEY`   | — (required)            |
| Workspace id| `-w, --workspace` | `PULSEOPS_WORKSPACE` | — (required for scoped) |

```bash
export PULSEOPS_API_URL=https://api.pulseops.example.com
export PULSEOPS_API_KEY=po_xxxxxxxx…
export PULSEOPS_WORKSPACE=1
```

Add `--json` to any command to emit the raw API payload instead of a table.
Colour is auto-disabled when output isn't a TTY or `NO_COLOR` is set.

## Commands

```
pulseops monitors list                     List every monitor
pulseops monitors get <monitorId>          Show one monitor's config + state
pulseops monitors live                     Latest cached status/latency
pulseops monitors checks <monitorId>       Check history  [--limit --offset]
pulseops monitors stats <monitorId>        Uptime + latency percentiles
pulseops monitors analytics <monitorId>    30-day SLA summary
pulseops incidents list                    Incidents, newest first
pulseops incidents get <incidentId>        One incident + its monitor
pulseops heartbeat <monitorId>             Push a liveness signal (HEARTBEAT)
```

`monitors` aliases to `mon`, `incidents` to `inc`, `heartbeat` to `hb`.

Exit codes: `0` success, `1` API/network error, `2` bad configuration.

### Scripting examples

```bash
# Fail CI if any monitor is down
pulseops monitors list --json \
  | jq -e 'all(.[]; .status != "DOWN")' > /dev/null || exit 1

# Keep a HEARTBEAT monitor alive from cron
*/5 * * * * pulseops heartbeat 42
```

## Keeping types in sync with the API

Request-side types are generated from the live OpenAPI document into
`src/generated/schema.d.ts`:

```bash
PULSEOPS_API_URL=http://localhost:4000 pnpm gen
```

The spec does not yet carry response schemas, so response models are
hand-authored in [`src/types.ts`](src/types.ts) to mirror the backend's Prisma
models and controllers — update that file when the models change.

## Layout

```
src/
  index.ts           CLI entry, global flags, error handling
  client.ts          Typed fetch client (x-api-key auth, envelope unwrapping)
  types.ts           Response models
  config.ts          Flag/env/default resolution
  context.ts         Per-command client + config wiring
  format.ts          Tables, colour, status glyphs, date/latency formatting
  commands/          monitors.ts · incidents.ts · heartbeat.ts
  generated/         schema.d.ts (from `pnpm gen`)
```
