#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveConfig, ConfigError } from "@pulseops/cli/config";
import { createServer } from "./server.js";

/**
 * Entry point: resolves connection settings from the environment and serves the
 * PulseOps MCP server over stdio (the transport MCP clients like Claude Desktop
 * launch). Config comes from env only — there are no CLI flags here:
 *   PULSEOPS_API_URL   API base URL (default http://localhost:4000)
 *   PULSEOPS_API_KEY   Workspace API key, po_…            (required)
 *   PULSEOPS_WORKSPACE Workspace id                        (required)
 *   PULSEOPS_MCP_ALLOW_HEARTBEAT=1  expose the heartbeat push tool (optional)
 */
async function main(): Promise<void> {
  const config = resolveConfig({});
  const allowHeartbeat = process.env.PULSEOPS_MCP_ALLOW_HEARTBEAT === "1";

  const server = createServer({ config, allowHeartbeat });
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // stdout is the JSON-RPC channel, so all diagnostics go to stderr.
  console.error(
    `pulseops-mcp ready (workspace ${config.workspaceId}, ` +
      `${allowHeartbeat ? "read + heartbeat" : "read-only"})`,
  );
}

main().catch((err) => {
  if (err instanceof ConfigError) {
    console.error("Configuration error: " + err.message);
    process.exit(2);
  }
  console.error(err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
