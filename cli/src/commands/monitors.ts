import type { Command } from "commander";
import { context, intArg } from "../context.js";
import { assertWritable, requireWorkspace } from "../config.js";
import {
  color,
  dash,
  fmtDate,
  fmtMs,
  keyValue,
  printJson,
  statusColor,
  table,
} from "../format.js";
import type { MonitorType, StatsWindow, UpdateMonitorInput } from "../types.js";

export function registerMonitorCommands(program: Command): void {
  const monitors = program
    .command("monitors")
    .alias("mon")
    .description("Inspect monitors, live state, checks and stats");

  monitors
    .command("list")
    .description("List every monitor in the workspace")
    .action(async (_opts, command: Command) => {
      const { client, config, json } = context(command);
      const rows = await client.listMonitors(requireWorkspace(config));
      if (json) return printJson(rows);
      console.log(
        table(rows, [
          { header: "ID", get: (m) => String(m.id) },
          { header: "NAME", get: (m) => m.name },
          { header: "TYPE", get: (m) => m.type },
          { header: "STATUS", get: (m) => statusColor(m.status) },
          { header: "URL", get: (m) => color.dim(m.url) },
          {
            header: "LAST",
            get: (m) => fmtMs(m.lastResponseTime),
          },
          { header: "CHECKED", get: (m) => fmtDate(m.lastCheckedAt) },
        ]),
      );
    });

  monitors
    .command("get")
    .argument("<monitorId>", "Monitor id")
    .description("Show a single monitor's configuration and state")
    .action(async (monitorId: string, _opts, command: Command) => {
      const { client, config, json } = context(command);
      const m = await client.getMonitor(
        requireWorkspace(config),
        intArg(monitorId, "monitorId"),
      );
      if (json) return printJson(m);
      console.log(
        keyValue([
          ["id", String(m.id)],
          ["name", color.bold(m.name)],
          ["status", statusColor(m.status)],
          ["type", m.type],
          ["url", `${m.method} ${m.url}`],
          ["interval", `${m.intervalSeconds}s`],
          ["timeout", fmtMs(m.timeoutMs)],
          ["expected status", String(m.expectedStatus)],
          ["active", m.isActive ? "yes" : "no"],
          ["last response", fmtMs(m.lastResponseTime)],
          ["last status code", dash(m.lastStatusCode)],
          ["last checked", fmtDate(m.lastCheckedAt)],
          ["last heartbeat", fmtDate(m.lastHeartbeatAt)],
          ["tls issuer", dash(m.tlsIssuer)],
          [
            "tls expires",
            m.tlsValidTo
              ? `${fmtDate(m.tlsValidTo)} (${dash(m.tlsDaysRemaining)}d)`
              : dash(null),
          ],
        ]),
      );
    });

  monitors
    .command("live")
    .description("Latest cached status/latency for each active monitor")
    .action(async (_opts, command: Command) => {
      const { client, config, json } = context(command);
      const live = await client.liveMonitors(requireWorkspace(config));
      if (json) return printJson(live);
      const rows = Object.entries(live).map(([id, s]) => ({ id, ...s }));
      console.log(
        table(rows, [
          { header: "ID", get: (r) => r.id },
          {
            header: "STATUS",
            get: (r) => (r.status ? statusColor(r.status) : dash(null)),
          },
          { header: "LATENCY", get: (r) => fmtMs(r.latency) },
          { header: "CODE", get: (r) => dash(r.statusCode) },
          { header: "AT", get: (r) => fmtDate(r.lastChecked) },
        ]),
      );
    });

  monitors
    .command("checks")
    .argument("<monitorId>", "Monitor id")
    .option("-l, --limit <n>", "Max rows (1-200)", "20")
    .option("-o, --offset <n>", "Rows to skip", "0")
    .description("Paginated check history for a monitor")
    .action(
      async (
        monitorId: string,
        opts: { limit: string; offset: string },
        command: Command,
      ) => {
        const { client, config, json } = context(command);
        const result = await client.listChecks(
          requireWorkspace(config),
          intArg(monitorId, "monitorId"),
          { limit: Number(opts.limit), offset: Number(opts.offset) },
        );
        if (json) return printJson(result);
        console.log(
          table(result.data, [
            { header: "TIME", get: (c) => fmtDate(c.checkedAt) },
            { header: "STATUS", get: (c) => statusColor(c.status) },
            { header: "CODE", get: (c) => dash(c.statusCode) },
            { header: "LATENCY", get: (c) => fmtMs(c.responseTimeMs) },
            { header: "ERROR", get: (c) => dash(c.errorMessage) },
          ]),
        );
        const { total, limit, offset } = result.meta;
        console.log(
          color.gray(
            `\n${offset + 1}–${offset + result.data.length} of ${total} ` +
              `(limit ${limit})`,
          ),
        );
      },
    );

  monitors
    .command("stats")
    .argument("<monitorId>", "Monitor id")
    .description("Uptime and latency percentiles (all-time / 24h / 30d)")
    .action(async (monitorId: string, _opts, command: Command) => {
      const { client, config, json } = context(command);
      const stats = await client.getStats(
        requireWorkspace(config),
        intArg(monitorId, "monitorId"),
      );
      if (json) return printJson(stats);
      const windowCol = (w: StatsWindow) => [
        `${w.uptimePercentage}%`,
        String(w.totalChecks),
        fmtMs(w.averageResponseTimeMs),
        fmtMs(w.p50ResponseTimeMs),
        fmtMs(w.p95ResponseTimeMs),
        fmtMs(w.p99ResponseTimeMs),
      ];
      console.log(`latest status  ${statusColor(stats.latestStatus)}\n`);
      const labels = ["uptime", "checks", "avg", "p50", "p95", "p99"];
      const allTime = windowCol(stats);
      const h24 = windowCol(stats.range24h);
      const d30 = windowCol(stats.range30d);
      console.log(
        table(
          labels.map((label, i) => ({ label, i })),
          [
            { header: "METRIC", get: (r) => r.label },
            { header: "ALL-TIME", get: (r) => allTime[r.i] },
            { header: "24H", get: (r) => h24[r.i] },
            { header: "30D", get: (r) => d30[r.i] },
          ],
        ),
      );
    });

  monitors
    .command("analytics")
    .argument("<monitorId>", "Monitor id")
    .description("30-day SLA summary (uptime, outages, downtime)")
    .action(async (monitorId: string, _opts, command: Command) => {
      const { client, config, json } = context(command);
      const a = await client.getAnalytics(
        requireWorkspace(config),
        intArg(monitorId, "monitorId"),
      );
      if (json) return printJson(a);
      console.log(
        keyValue([
          ["uptime (30d)", `${a.uptime30Day}%`],
          ["outages (30d)", String(a.totalOutages30Day)],
          ["downtime (30d)", `${a.downtimeMinutes30Day} min`],
          ["avg latency (24h)", fmtMs(a.avgLatency24h)],
        ]),
      );
    });

  // --- writes (require `pulseops login` + OWNER/ADMIN; API keys can't mutate) --

  monitors
    .command("create")
    .description("Create a monitor")
    .requiredOption("-n, --name <name>", "Monitor name (2–80 chars)")
    .option("--url <url>", "URL to check (required for HTTP monitors)")
    .option("--type <type>", "HTTP or HEARTBEAT", "HTTP")
    .option("-X, --method <method>", "HTTP method (GET/POST/PUT/PATCH/DELETE)", "GET")
    .option("-i, --interval <seconds>", "Check interval in seconds", "60")
    .option("--timeout <ms>", "Request timeout in ms", "5000")
    .option("--expect <code>", "Expected HTTP status code", "200")
    .option("--grace <seconds>", "Grace period before opening an incident", "60")
    .action(async (opts, command: Command) => {
      const { client, config, json } = context(command);
      assertWritable(config);
      const ws = requireWorkspace(config);
      const type = opts.type.toUpperCase() as MonitorType;
      const m = await client.createMonitor(ws, {
        name: opts.name,
        type,
        url: opts.url,
        method: opts.method?.toUpperCase(),
        intervalSeconds: Number(opts.interval),
        timeoutMs: Number(opts.timeout),
        expectedStatus: Number(opts.expect),
        gracePeriodSeconds: Number(opts.grace),
      });
      if (json) return printJson(m);
      console.log(color.green(`✓ created monitor #${m.id} — ${m.name}`));
    });

  monitors
    .command("update")
    .alias("edit")
    .argument("<monitorId>", "Monitor id")
    .description("Update a monitor (only the flags you pass are changed)")
    .option("-n, --name <name>", "Monitor name")
    .option("--url <url>", "URL to check")
    .option("-X, --method <method>", "HTTP method")
    .option("-i, --interval <seconds>", "Check interval in seconds")
    .option("--timeout <ms>", "Request timeout in ms")
    .option("--expect <code>", "Expected HTTP status code")
    .option("--grace <seconds>", "Grace period in seconds")
    .action(async (monitorId: string, opts, command: Command) => {
      const { client, config, json } = context(command);
      assertWritable(config);
      const patch: UpdateMonitorInput = {};
      if (opts.name !== undefined) patch.name = opts.name;
      if (opts.url !== undefined) patch.url = opts.url;
      if (opts.method !== undefined) patch.method = opts.method.toUpperCase();
      if (opts.interval !== undefined) patch.intervalSeconds = Number(opts.interval);
      if (opts.timeout !== undefined) patch.timeoutMs = Number(opts.timeout);
      if (opts.expect !== undefined) patch.expectedStatus = Number(opts.expect);
      if (opts.grace !== undefined) patch.gracePeriodSeconds = Number(opts.grace);
      if (Object.keys(patch).length === 0) {
        throw new Error("Nothing to update — pass at least one field to change.");
      }
      const m = await client.updateMonitor(
        requireWorkspace(config),
        intArg(monitorId, "monitorId"),
        patch,
      );
      if (json) return printJson(m);
      console.log(color.green(`✓ updated monitor #${m.id} — ${m.name}`));
    });

  monitors
    .command("rm")
    .alias("delete")
    .argument("<monitorId>", "Monitor id")
    .option("-y, --yes", "Skip the confirmation prompt")
    .description("Delete a monitor (and its history)")
    .action(async (monitorId: string, opts: { yes?: boolean }, command: Command) => {
      const { client, config } = context(command);
      assertWritable(config);
      if (!opts.yes) {
        throw new Error(
          `Refusing to delete monitor ${monitorId} without confirmation — re-run with --yes.`,
        );
      }
      await client.deleteMonitor(
        requireWorkspace(config),
        intArg(monitorId, "monitorId"),
      );
      console.log(color.green(`✓ deleted monitor #${monitorId}`));
    });

  const stateCmd = (
    name: string,
    describe: string,
    fn: "pauseMonitor" | "resumeMonitor" | "runCheck",
    ok: (id: string) => string,
  ) =>
    monitors
      .command(name)
      .argument("<monitorId>", "Monitor id")
      .description(describe)
      .action(async (monitorId: string, _opts, command: Command) => {
        const { client, config, json } = context(command);
        assertWritable(config);
        const res = await client[fn](
          requireWorkspace(config),
          intArg(monitorId, "monitorId"),
        );
        if (json) return printJson(res);
        console.log(color.green(ok(monitorId)));
      });

  stateCmd("pause", "Pause a monitor (stop checking it)", "pauseMonitor", (id) => `✓ paused monitor #${id}`);
  stateCmd("resume", "Resume a paused monitor", "resumeMonitor", (id) => `✓ resumed monitor #${id}`);
  stateCmd("check", 'Run an on-demand "check now"', "runCheck", (id) => `✓ triggered a check for monitor #${id}`);
}
