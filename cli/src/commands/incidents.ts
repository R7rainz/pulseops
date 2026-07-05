import type { Command } from "commander";
import { context, intArg } from "../context.js";
import { requireWorkspace } from "../config.js";
import {
  color,
  dash,
  fmtDate,
  keyValue,
  printJson,
  statusColor,
  table,
} from "../format.js";

/** Human duration between two ISO instants (or now if unresolved). */
function duration(startedAt: string, resolvedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
  const mins = Math.max(0, Math.round((end - start) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function registerIncidentCommands(program: Command): void {
  const incidents = program
    .command("incidents")
    .alias("inc")
    .description("Browse incident history");

  incidents
    .command("list")
    .description("List incidents in the workspace, newest first")
    .action(async (_opts, command: Command) => {
      const { client, config, json } = context(command);
      const rows = await client.listIncidents(requireWorkspace(config));
      if (json) return printJson(rows);
      console.log(
        table(rows, [
          { header: "ID", get: (i) => String(i.id) },
          { header: "STATUS", get: (i) => statusColor(i.status) },
          { header: "TITLE", get: (i) => i.title },
          { header: "MONITOR", get: (i) => String(i.monitorId) },
          { header: "STARTED", get: (i) => fmtDate(i.startedAt) },
          {
            header: "DURATION",
            get: (i) => duration(i.startedAt, i.resolvedAt),
          },
        ]),
      );
    });

  incidents
    .command("get")
    .argument("<incidentId>", "Incident id")
    .description("Show a single incident with its monitor")
    .action(async (incidentId: string, _opts, command: Command) => {
      const { client, json } = context(command);
      const i = await client.getIncident(intArg(incidentId, "incidentId"));
      if (json) return printJson(i);
      console.log(
        keyValue([
          ["id", String(i.id)],
          ["title", color.bold(i.title)],
          ["status", statusColor(i.status)],
          ["monitor", i.monitor ? `${i.monitor.name} (#${i.monitorId})` : String(i.monitorId)],
          ["started", fmtDate(i.startedAt)],
          ["resolved", i.resolvedAt ? fmtDate(i.resolvedAt) : dash(null)],
          ["duration", duration(i.startedAt, i.resolvedAt)],
        ]),
      );
    });
}
