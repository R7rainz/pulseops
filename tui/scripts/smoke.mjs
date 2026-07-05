// Renders the TUI headlessly with ink-testing-library and prints a frame after
// the first data load — proves it mounts and shows real data without a TTY.
// Requires PULSEOPS_API_URL / PULSEOPS_API_KEY / PULSEOPS_WORKSPACE in env.
import { render } from "ink-testing-library";
import { createElement } from "react";
import { PulseOpsClient } from "@pulseops/cli/client";
import { resolveConfig } from "@pulseops/cli/config";
import { App } from "../dist/app.js";

const config = resolveConfig({});
const client = new PulseOpsClient(config);

const { lastFrame, unmount } = render(
  createElement(App, { client, config }),
);

// Give the polls a moment to resolve against the live backend.
await new Promise((r) => setTimeout(r, 2500));

const frame = lastFrame();
console.log(frame);
unmount();

if (!frame || !/PulseOps/.test(frame)) {
  console.error("\nSMOKE FAIL: header not rendered");
  process.exit(1);
}
console.log("\nsmoke OK");
process.exit(0);
