import { render } from "ink";
import type { ConfigOverrides } from "../config.js";
import { Root } from "./root.js";

/**
 * Boots the live terminal dashboard and resolves when the user exits it.
 * Imported dynamically from the CLI entry so Ink/React are only loaded when the
 * dashboard is actually launched — plain `pulseops <subcommand>` stays lean.
 */
export async function launchTui(overrides: ConfigOverrides = {}): Promise<void> {
  const { waitUntilExit } = render(<Root overrides={overrides} />);
  await waitUntilExit();
}
