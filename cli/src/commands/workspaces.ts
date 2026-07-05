import type { Command } from "commander";
import { context, intArg } from "../context.js";
import { PulseOpsClient } from "../client.js";
import type { Config } from "../config.js";
import { loadCredentials, updateCredentials } from "../credentials.js";
import { color, printJson, table } from "../format.js";

export function registerWorkspaceCommands(program: Command): void {
  program
    .command("workspaces")
    .alias("ws")
    .description("List the workspaces you belong to")
    .action(async (_opts, command: Command) => {
      const { config, client, json } = context(command);
      if (config.auth.mode === "key") {
        throw new Error(
          "Listing workspaces requires `pulseops login` — API keys are scoped to one workspace.",
        );
      }
      const workspaces = await client.listWorkspaces();
      if (json) return printJson(workspaces);
      const current = config.workspaceId;
      console.log(
        table(workspaces, [
          { header: "", get: (w) => (w.id === current ? color.cyan("●") : " ") },
          { header: "ID", get: (w) => String(w.id) },
          { header: "NAME", get: (w) => w.name },
          { header: "ROLE", get: (w) => color.gray(w.role ?? "—") },
        ]),
      );
      if (current != null) console.log(color.gray("\n● current"));
    });

  program
    .command("use")
    .argument("<workspaceId>", "Workspace id to make the default")
    .description("Set the default workspace for subsequent commands")
    .action(async (workspaceId: string, _opts, command: Command) => {
      const creds = loadCredentials();
      if (!creds) {
        throw new Error("Run `pulseops login` first — `use` sets a default for your session.");
      }
      const id = intArg(workspaceId, "workspaceId");

      // Verify membership so we fail fast on a bad id.
      const cfg: Config = {
        apiUrl: creds.apiUrl,
        auth: {
          mode: "session",
          accessToken: creds.accessToken,
          refreshToken: creds.refreshToken,
        },
        fromStoredSession: true,
      };
      const client = new PulseOpsClient(cfg, (t) => updateCredentials(t));
      const workspaces = await client.listWorkspaces();
      const match = workspaces.find((w) => w.id === id);
      if (!match) {
        throw new Error(
          `You're not a member of workspace ${id}. Run \`pulseops workspaces\` to see yours.`,
        );
      }

      updateCredentials({ workspaceId: id });
      console.log(color.green(`✓ Default workspace set to ${id} · ${match.name}`));
    });
}
