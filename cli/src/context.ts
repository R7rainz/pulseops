import type { Command } from "commander";
import { PulseOpsClient } from "./client.js";
import { resolveConfig, type Config } from "./config.js";

export interface Context {
  config: Config;
  client: PulseOpsClient;
  json: boolean;
}

/**
 * Builds a client + config from the merged global/local options of the command
 * being run. Global flags (`--url`, `--api-key`, `--workspace`, `--json`) are
 * declared once on the root program and pulled in via `optsWithGlobals()`.
 */
export function context(command: Command): Context {
  const opts = command.optsWithGlobals();
  const config = resolveConfig({
    url: opts.url,
    apiKey: opts.apiKey,
    workspace: opts.workspace,
  });
  return {
    config,
    client: new PulseOpsClient(config),
    json: Boolean(opts.json),
  };
}

/** Parses a positional integer argument, exiting cleanly on bad input. */
export function intArg(value: string, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new Error(`Invalid ${name}: ${value} (expected an integer)`);
  }
  return n;
}
