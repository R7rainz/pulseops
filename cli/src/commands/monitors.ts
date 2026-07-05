import type { Command } from "commander";
import { context, intArg } from "../context.js";
import { requireWorkspace } from "../config.js";
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
import type { StatsWindow } from "../types.js";

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
}
