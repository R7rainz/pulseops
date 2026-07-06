// Renders the dashboard headlessly against a mock client — proves the TUI
// mounts and paints real data without a TTY or a live backend. Run with
// `pnpm smoke` after `pnpm build`.
import { render } from "ink-testing-library";
import { createElement as h } from "react";
import { App } from "../dist/tui/app.js";

const iso = (ms) => new Date(Date.now() - ms).toISOString();
const monitors = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1, workspaceId: 1, name: `svc-${i + 1}`, type: "HTTP",
  url: `https://s${i}.example/health`, method: "GET", intervalSeconds: 60,
  timeoutMs: 5000, expectedStatus: 200, gracePeriodSeconds: 0,
  status: ["UP", "DOWN", "DEGRADED", "UP", "UP", "PAUSED"][i], consecutiveFailures: 0,
  graceThreshold: 3, isActive: true, lastCheckedAt: iso(5000),
  lastResponseTime: 100 + i * 50, lastStatusCode: 200, lastHeartbeatAt: null,
  tlsIssuer: null, tlsValidTo: null, tlsDaysRemaining: null,
  createdAt: iso(9e9), updatedAt: iso(1e6), maintenanceStartAt: null, maintenanceEndAt: null,
}));
const checks = Array.from({ length: 40 }, (_, i) => ({
  id: i, monitorId: 1, status: "UP", statusCode: 200,
  responseTimeMs: Math.round(200 + 120 * Math.sin(i / 3)), errorMessage: null, checkedAt: iso(i * 60000),
}));
const sw = { totalChecks: 100, upChecks: 99, downChecks: 1, degradedChecks: 0,
  uptimePercentage: 99.5, averageResponseTimeMs: 220, p50ResponseTimeMs: 200,
  p95ResponseTimeMs: 400, p99ResponseTimeMs: 800 };
const client = {
  listMonitors: async () => monitors,
  liveMonitors: async () => Object.fromEntries(monitors.map((m) => [String(m.id), { status: m.status, latency: m.lastResponseTime, statusCode: 200, lastChecked: iso(3000) }])),
  listIncidents: async () => [{ id: 1, monitorId: 2, status: "OPEN", title: "svc-2 down", startedAt: iso(3600000), resolvedAt: null }],
  getStats: async () => ({ latestStatus: "UP", range24h: sw, range30d: sw, ...sw }),
  getAnalytics: async () => ({ uptime30Day: 99.9, totalOutages30Day: 1, downtimeMinutes30Day: 5, avgLatency24h: 210 }),
  listChecks: async () => ({ data: checks, meta: { total: 40, limit: 40, offset: 0 } }),
};
const config = { apiUrl: "http://localhost:4000", workspaceId: 1, auth: { mode: "key", apiKey: "x" }, fromStoredSession: false };
process.env.PULSEOPS_CONFIG_DIR = "/tmp/claude-1000/-home-rainz-Documents-projects-ts-pulseops/06dc8d1b-0c8c-48ba-a467-49319bd7f032/scratchpad/cfg2";
const { lastFrame, unmount } = render(h(App, { client, config }));
await new Promise((r) => setTimeout(r, 600));
const frame = lastFrame();
console.log(frame);
unmount();
if (!frame || !/PulseOps/.test(frame) || !/FLEET STATUS/.test(frame)) {
  console.error("\nSMOKE FAIL: dashboard did not render");
  process.exit(1);
}
console.log("\nsmoke OK");
process.exit(0);
