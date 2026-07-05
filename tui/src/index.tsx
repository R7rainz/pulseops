#!/usr/bin/env node
import { render } from "ink";
import { resolveConfig, requireWorkspace, ConfigError } from "@pulseops/cli/config";
import { PulseOpsClient } from "@pulseops/cli/client";
import { App } from "./app.js";

/**
 * Entry point for the PulseOps terminal dashboard. Reads connection settings
 * from the environment (same as the CLI): PULSEOPS_API_URL / _API_KEY /
 * _WORKSPACE. A workspace is required — the dashboard is scoped to one.
 */
try {
  const config = resolveConfig({});
  requireWorkspace(config); // fail fast with a clear message if unset
  const client = new PulseOpsClient(config);
  const { waitUntilExit } = render(<App client={client} config={config} />);
  await waitUntilExit();
} catch (err) {
  if (err instanceof ConfigError) {
    console.error("Config error: " + err.message);
    process.exit(2);
  }
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
