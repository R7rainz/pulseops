import type { Command } from "commander";
import { PulseOpsClient } from "./client.js";
import { resolveConfig, type Config } from "./config.js";
import { updateCredentials } from "./credentials.js";

export interface Context {
  config: Config;
  client: PulseOpsClient;
  json: boolean;
}

/**
 * Builds a client + config from the merged global/local options of the command
 * being run. Global flags (`--url`, `--api-key`, `--workspace`, `--json`) are
 * declared once on the root program and pulled in via `optsWithGlobals()`.
 * In stored-session mode, refreshed tokens are written back to the credentials
 * file so the next invocation stays signed in.
 */
export function context(command: Command): Context {
  const opts = command.optsWithGlobals();
  const config = resolveConfig({
    url: opts.url,
    apiKey: opts.apiKey,
    workspace: opts.workspace,
  });
  const client = new PulseOpsClient(
    config,
    config.fromStoredSession
      ? (tokens) => updateCredentials(tokens)
      : undefined,
  );
  return { config, client, json: Boolean(opts.json) };
}

/** Parses a positional integer argument like monitorId and incidentId, exiting cleanly on bad input. */
export function intArg(value: string, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new Error(`Invalid ${name}: ${value} (expected an integer)`);
  }
  return n;
}
