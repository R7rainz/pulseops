#!/usr/bin/env node
import { Command } from "commander";
import { registerMonitorCommands } from "./commands/monitors.js";
import { registerIncidentCommands } from "./commands/incidents.js";
import { registerWebhookCommands } from "./commands/webhooks.js";
import { registerHeartbeatCommand } from "./commands/heartbeat.js";
import { registerAuthCommands } from "./commands/auth.js";
import { registerWorkspaceCommands } from "./commands/workspaces.js";
import { ApiError } from "./client.js";
import { ConfigError } from "./config.js";
import { color } from "./format.js";

const program = new Command();

program
  .name("pulseops")
  .description(
    "PulseOps in your terminal — a scriptable CLI and a live TUI dashboard for\n" +
      "your monitors, incidents, uptime and latency.\n\n" +
      "Run `pulseops` with no command to open the dashboard, or use a subcommand\n" +
      "below. Sign in with `pulseops login`, or use an API key (--api-key /\n" +
      "PULSEOPS_API_KEY).",
  )
  .version("1.2.0")
  .option(
    "--url <url>",
    "API base URL (env PULSEOPS_API_URL)",
  )
  .option(
    "-k, --api-key <key>",
    "Workspace API key, po_… (env PULSEOPS_API_KEY)",
  )
  .option(
    "-w, --workspace <id>",
    "Workspace id (env PULSEOPS_WORKSPACE)",
  )
  .option("--json", "Emit raw JSON instead of a formatted table")
  .showHelpAfterError();

registerAuthCommands(program);
registerWorkspaceCommands(program);
registerMonitorCommands(program);
registerIncidentCommands(program);
registerWebhookCommands(program);
registerHeartbeatCommand(program);

/** Launch the Ink dashboard, honouring the global connection/auth flags. */
async function runDashboard(): Promise<void> {
  const opts = program.opts();
  // Loaded lazily so `pulseops <subcommand>` never pays for Ink/React.
  const { launchTui } = await import("./tui/launch.js");
  await launchTui({
    url: opts.url,
    apiKey: opts.apiKey,
    workspace: opts.workspace,
  });
}

program
  .command("tui")
  .alias("dashboard")
  .description("Open the live terminal dashboard (monitors, incidents, graphs)")
  .action(runDashboard);

// Bare `pulseops` (no subcommand) opens the dashboard.
program.action(runDashboard);

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(color.red("Error: ") + err.message);
      process.exit(2);
    }
    if (err instanceof ApiError) {
      const prefix = err.status ? `API ${err.status}: ` : "";
      console.error(color.red("Error: ") + prefix + err.message);
      // status 0 = couldn't reach the server. PulseOps is self-hosted, so this
      // usually means there's no backend running — point people at their own.
      if (err.status === 0) {
        console.error(
          color.dim(
            "\nPulseOps is self-hosted — this CLI needs a backend to connect to.\n" +
              "Run your own in one command:  git clone https://github.com/R7rainz/pulseops && cd pulseops && docker compose up\n" +
              "Then set  PULSEOPS_API_URL  to your instance (default http://localhost:4000).",
          ),
        );
      }
      process.exit(1);
    }
    console.error(
      color.red("Error: ") + (err instanceof Error ? err.message : String(err)),
    );
    process.exit(1);
  }
}

void main();
