import type { Command } from "commander";
import { context, intArg } from "../context.js";
import { color, printJson } from "../format.js";

export function registerHeartbeatCommand(program: Command): void {
  program
    .command("heartbeat")
    .alias("hb")
    .argument("<monitorId>", "HEARTBEAT monitor id")
    .description("Send a liveness signal for a HEARTBEAT monitor")
    .action(async (monitorId: string, _opts, command: Command) => {
      const { client, json } = context(command);
      const result = await client.heartbeat(intArg(monitorId, "monitorId"));
      if (json) return printJson(result ?? { ok: true });
      console.log(color.green(`✓ heartbeat sent for monitor ${monitorId}`));
    });
}
