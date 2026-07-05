# @pulseops/mcp

[Model Context Protocol](https://modelcontextprotocol.io) server that exposes the
PulseOps read API to LLM agents (Claude Desktop, IDEs, custom clients). It reuses
the typed client from [`@pulseops/cli`](../cli) and serves over stdio.

## Why this is safe to wire to an LLM

Every tool is **read-only** and scoped to the single workspace bound to the API
key — the model never picks a workspace, and v1 keys cannot mutate anything. The
only non-read tool, `pulseops_send_heartbeat`, is **not registered** unless you
opt in with `PULSEOPS_MCP_ALLOW_HEARTBEAT=1`. Tools are annotated with
`readOnlyHint` so clients can display and gate them accordingly.

## Install & build

```bash
cd cli && pnpm install && pnpm build   # the MCP server depends on cli's dist/
cd ../mcp && pnpm install && pnpm build
```

## Configuration (environment only)

| Variable                       | Required | Default                 | Purpose                                  |
| ------------------------------ | -------- | ----------------------- | ---------------------------------------- |
| `PULSEOPS_API_KEY`             | yes      | —                       | Workspace API key (`po_…`, read-only)    |
| `PULSEOPS_WORKSPACE`           | yes      | —                       | Workspace id the tools operate on        |
| `PULSEOPS_API_URL`             | no       | `http://localhost:4000` | API base URL                             |
| `PULSEOPS_MCP_ALLOW_HEARTBEAT` | no       | unset                   | Set to `1` to expose the heartbeat tool  |

## Register with Claude Desktop

Add to `claude_desktop_config.json` (macOS:
`~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):

```json
{
  "mcpServers": {
    "pulseops": {
      "command": "node",
      "args": ["/absolute/path/to/pulseops/mcp/dist/index.js"],
      "env": {
        "PULSEOPS_API_URL": "https://api.pulseops.example.com",
        "PULSEOPS_API_KEY": "po_xxxxxxxx…",
        "PULSEOPS_WORKSPACE": "1"
      }
    }
  }
}
```

Restart the client; the PulseOps tools appear in the tool picker.

## Tools

| Tool                             | Args                          | Read-only |
| -------------------------------- | ----------------------------- | --------- |
| `pulseops_list_monitors`         | —                             | ✓         |
| `pulseops_get_monitor`           | `monitorId`                   | ✓         |
| `pulseops_live_monitors`         | —                             | ✓         |
| `pulseops_list_monitor_checks`   | `monitorId, limit?, offset?`  | ✓         |
| `pulseops_get_monitor_stats`     | `monitorId`                   | ✓         |
| `pulseops_get_monitor_analytics` | `monitorId`                   | ✓         |
| `pulseops_list_incidents`        | —                             | ✓         |
| `pulseops_get_incident`          | `incidentId`                  | ✓         |
| `pulseops_send_heartbeat`        | `monitorId`                   | ✗ (opt-in)|

Tools return the raw JSON payload as text so the model can reason over it.

## Smoke test

With the env vars set and the backend running:

```bash
node scripts/smoke.mjs
```

Spawns the built server over stdio, lists the tools, and calls a few (including
a deliberate 404 to confirm errors surface as tool errors, not crashes).

## Layout

```
src/
  index.ts     stdio entry — resolves env config, connects the transport
  server.ts    createServer(): registers the read tools (+ optional heartbeat)
scripts/
  smoke.mjs    stdio smoke test using the MCP SDK client
```
