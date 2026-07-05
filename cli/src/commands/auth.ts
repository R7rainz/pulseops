import type { Command } from "commander";
import { PulseOpsClient } from "../client.js";
import type { Config } from "../config.js";
import {
  deviceAuthorize,
  devicePoll,
  openBrowser,
  sleep,
} from "../auth.js";
import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
  updateCredentials,
  type Credentials,
} from "../credentials.js";
import { color } from "../format.js";

function resolveApiUrl(command: Command): string {
  const opts = command.optsWithGlobals();
  return (
    opts.url ||
    process.env.PULSEOPS_API_URL ||
    loadCredentials()?.apiUrl ||
    "http://localhost:4000"
  ).replace(/\/+$/, "");
}

function sessionClient(creds: Credentials): PulseOpsClient {
  const config: Config = {
    apiUrl: creds.apiUrl,
    auth: {
      mode: "session",
      accessToken: creds.accessToken,
      refreshToken: creds.refreshToken,
    },
    workspaceId: creds.workspaceId,
    fromStoredSession: true,
  };
  return new PulseOpsClient(config, (tokens) => updateCredentials(tokens));
}

export function registerAuthCommands(program: Command): void {
  program
    .command("login")
    .description("Sign in through your browser (device authorization)")
    .action(async (_opts, command: Command) => {
      const apiUrl = resolveApiUrl(command);

      const auth = await deviceAuthorize(apiUrl);
      console.log(
        `\nTo sign in, open ${color.cyan(auth.verificationUri)} and enter this code:\n`,
      );
      console.log(`    ${color.bold(auth.userCode)}\n`);
      console.log(color.gray("Opening your browser…  (Ctrl-C to cancel)"));
      openBrowser(auth.verificationUriComplete);

      const deadline = Date.now() + auth.expiresIn * 1000;
      let result: Awaited<ReturnType<typeof devicePoll>> = { status: "pending" };
      while (Date.now() < deadline) {
        await sleep(auth.interval * 1000);
        result = await devicePoll(apiUrl, auth.deviceCode);
        if (result.status === "authorized") break;
        if (result.status === "expired") {
          throw new Error("The login request expired. Run `pulseops login` again.");
        }
      }
      if (result.status !== "authorized") {
        throw new Error("Timed out waiting for approval. Run `pulseops login` again.");
      }

      const creds: Credentials = {
        apiUrl,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user ?? undefined,
      };
      saveCredentials(creds);

      // Auto-select a workspace so no manual PULSEOPS_WORKSPACE is needed.
      const client = sessionClient(creds);
      const workspaces = await client.listWorkspaces().catch(() => []);
      const who = result.user?.email ?? "your account";
      console.log(color.green(`\n✓ Signed in as ${who}`));

      if (workspaces.length === 1) {
        saveCredentials({ ...creds, workspaceId: workspaces[0].id });
        console.log(
          `  Using workspace ${color.bold(String(workspaces[0].id))} · ${workspaces[0].name}`,
        );
      } else if (workspaces.length > 1) {
        console.log(
          color.gray(
            `  You have ${workspaces.length} workspaces — pick one with ` +
              `\`pulseops use <id>\` (see \`pulseops workspaces\`).`,
          ),
        );
      }
    });

  program
    .command("logout")
    .description("Sign out and remove stored credentials")
    .action(async () => {
      const creds = loadCredentials();
      if (creds) {
        // Best-effort server-side session revoke.
        await fetch(`${creds.apiUrl}/api/v1/auth/logout`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ refreshToken: creds.refreshToken }),
        }).catch(() => {});
      }
      clearCredentials();
      console.log(color.green("✓ Signed out."));
    });

  program
    .command("whoami")
    .description("Show the signed-in user and current workspace")
    .action(async () => {
      const creds = loadCredentials();
      if (!creds) {
        console.log(
          color.gray("Not logged in. Run `pulseops login` (or use PULSEOPS_API_KEY)."),
        );
        return;
      }
      const client = sessionClient(creds);
      let user;
      try {
        user = await client.me();
      } catch {
        console.log(
          color.red("Your session has expired. Run `pulseops login` again."),
        );
        process.exitCode = 1;
        return;
      }
      console.log(`${color.bold(user.email)}${user.name ? ` (${user.name})` : ""}`);
      console.log(color.gray(`api      ${creds.apiUrl}`));
      console.log(
        color.gray(
          `workspace ${creds.workspaceId != null ? creds.workspaceId : "— (run `pulseops use <id>`)"}`,
        ),
      );
    });
}
