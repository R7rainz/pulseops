#!/usr/bin/env node
import { render } from "ink";
import { Root } from "./root.js";

/**
 * Entry point for the PulseOps terminal dashboard. `Root` decides what to show:
 * a device-login screen if you're not signed in, a workspace picker if you
 * haven't chosen one, then the live dashboard. Auth/config come from stored
 * `pulseops login` credentials or PULSEOPS_API_KEY / PULSEOPS_WORKSPACE.
 */
const { waitUntilExit } = render(<Root />);
await waitUntilExit();
