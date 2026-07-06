import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { PulseOpsClient, ApiError } from "pulseops/client";
import { requireWorkspace, type Config } from "pulseops/config";
import { z } from "zod";

export interface ServerOptions {
  config: Config;
  /** Expose the heartbeat push tool (the one non-read action). Off by default. */
  allowHeartbeat?: boolean;
}

const monitorId = z
  .number()
  .int()
  .positive()
  .describe("Numeric monitor id");
const incidentId = z
  .number()
  .int()
  .positive()
  .describe("Numeric incident id");

/** Serialises any payload as pretty JSON text content. */
function ok(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

/** Wraps a tool body so API/network errors surface as tool errors, not crashes. */
async function guard(fn: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (err) {
    const message =
      err instanceof ApiError
        ? `PulseOps API ${err.status || ""}: ${err.message}`.trim()
        : err instanceof Error
          ? err.message
          : String(err);
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

/**
 * Builds an MCP server over the PulseOps read API. All tools are read-only and
 * scoped to the workspace bound to the configured API key — the model never
 * chooses a workspace and (unless `allowHeartbeat`) cannot mutate anything,
 * which is what makes wiring an LLM to this safe in v1.
 */
export function createServer(options: ServerOptions): McpServer {
  const { config } = options;
  const workspaceId = requireWorkspace(config);
  const client = new PulseOpsClient(config);

  const server = new McpServer({
    name: "pulseops",
    version: "0.1.0",
  });

  const readOnly = { readOnlyHint: true, openWorldHint: true } as const;

  server.tool(
    "pulseops_list_monitors",
    "List every monitor in the workspace with its current status, URL and last check.",
    {},
    readOnly,
    () => guard(async () => ok(await client.listMonitors(workspaceId))),
  );

  server.tool(
    "pulseops_get_monitor",
    "Get a single monitor's full configuration and latest state by id.",
    { monitorId },
    readOnly,
    ({ monitorId }) =>
      guard(async () => ok(await client.getMonitor(workspaceId, monitorId))),
  );

  server.tool(
    "pulseops_live_monitors",
    "Latest cached status, latency and status code for each active monitor, keyed by monitor id.",
    {},
    readOnly,
    () => guard(async () => ok(await client.liveMonitors(workspaceId))),
  );

  server.tool(
    "pulseops_list_monitor_checks",
    "Paginated history of individual check results for a monitor (newest first).",
    {
      monitorId,
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .default(20)
        .describe("Max rows to return (1-200)"),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe("Rows to skip for pagination"),
    },
    readOnly,
    ({ monitorId, limit, offset }) =>
      guard(async () =>
        ok(await client.listChecks(workspaceId, monitorId, { limit, offset })),
      ),
  );

  server.tool(
    "pulseops_get_monitor_stats",
    "Uptime and latency percentiles (p50/p95/p99) for a monitor, all-time and over the 24h and 30d windows.",
    { monitorId },
    readOnly,
    ({ monitorId }) =>
      guard(async () => ok(await client.getStats(workspaceId, monitorId))),
  );

  server.tool(
    "pulseops_get_monitor_analytics",
    "30-day SLA summary for a monitor: uptime %, outage count, downtime minutes and 24h average latency.",
    { monitorId },
    readOnly,
    ({ monitorId }) =>
      guard(async () => ok(await client.getAnalytics(workspaceId, monitorId))),
  );

  server.tool(
    "pulseops_list_incidents",
    "List incidents in the workspace, newest first.",
    {},
    readOnly,
    () => guard(async () => ok(await client.listIncidents(workspaceId))),
  );

  server.tool(
    "pulseops_get_incident",
    "Get a single incident by id, including its parent monitor.",
    { incidentId },
    readOnly,
    ({ incidentId }) =>
      guard(async () => ok(await client.getIncident(incidentId))),
  );

  if (options.allowHeartbeat) {
    server.tool(
      "pulseops_send_heartbeat",
      "Push a liveness signal to a HEARTBEAT monitor, keeping it UP. This is the only non-read action; it is disabled unless the server is started with heartbeats allowed.",
      { monitorId },
      { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      ({ monitorId }) =>
        guard(async () => ok(await client.heartbeat(monitorId))),
    );
  }

  return server;
}
