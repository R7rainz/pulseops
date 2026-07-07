import type { Command } from "commander";
import { context, intArg } from "../context.js";
import { assertWritable, requireWorkspace } from "../config.js";
import {
  color,
  dash,
  fmtDate,
  keyValue,
  printJson,
  table,
} from "../format.js";
import { WEBHOOK_EVENTS, type UpdateWebhookInput } from "../types.js";

/** Parse a comma-separated `--events` value, validating against the allowed set. */
function parseEvents(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined;
  const events = raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const bad = events.filter((e) => !WEBHOOK_EVENTS.includes(e as never));
  if (bad.length) {
    throw new Error(
      `Unknown event(s): ${bad.join(", ")}. Allowed: ${WEBHOOK_EVENTS.join(", ")}`,
    );
  }
  return events;
}

export function registerWebhookCommands(program: Command): void {
  const webhooks = program
    .command("webhooks")
    .alias("wh")
    .description("Manage webhook notification channels (needs `pulseops login`)");

  webhooks
    .command("list")
    .description("List the workspace's webhooks")
    .action(async (_opts, command: Command) => {
      const { client, config, json } = context(command);
      assertWritable(config); // whole module is session-only (no API-key access)
      const rows = await client.listWebhooks(requireWorkspace(config));
      if (json) return printJson(rows);
      console.log(
        table(rows, [
          { header: "ID", get: (w) => String(w.id) },
          { header: "NAME", get: (w) => w.name || dash(null) },
          { header: "URL", get: (w) => color.dim(w.url) },
          { header: "EVENTS", get: (w) => w.events.join(", ") },
          {
            header: "ACTIVE",
            get: (w) => (w.isActive ? color.green("yes") : color.gray("no")),
          },
          { header: "TESTED", get: (w) => fmtDate(w.lastTestedAt) },
        ]),
      );
    });

  webhooks
    .command("create")
    .description("Create a webhook")
    .requiredOption("--url <url>", "Endpoint URL to POST events to")
    .option("-n, --name <name>", "Display name")
    .option(
      "-e, --events <list>",
      `Comma-separated events (${WEBHOOK_EVENTS.join(",")})`,
    )
    .action(async (opts, command: Command) => {
      const { client, config, json } = context(command);
      assertWritable(config);
      const w = await client.createWebhook(requireWorkspace(config), {
        url: opts.url,
        name: opts.name,
        events: parseEvents(opts.events),
      });
      if (json) return printJson(w);
      console.log(color.green(`✓ created webhook #${w.id}${w.name ? ` — ${w.name}` : ""}`));
    });

  webhooks
    .command("update")
    .alias("edit")
    .argument("<webhookId>", "Webhook id")
    .description("Update a webhook (only the flags you pass are changed)")
    .option("--url <url>", "Endpoint URL")
    .option("-n, --name <name>", "Display name")
    .option("-e, --events <list>", "Comma-separated events")
    .option("--active", "Enable the webhook")
    .option("--inactive", "Disable the webhook")
    .action(async (webhookId: string, opts, command: Command) => {
      const { client, config, json } = context(command);
      assertWritable(config);
      const patch: UpdateWebhookInput = {};
      if (opts.url !== undefined) patch.url = opts.url;
      if (opts.name !== undefined) patch.name = opts.name;
      const events = parseEvents(opts.events);
      if (events !== undefined) patch.events = events;
      if (opts.active) patch.isActive = true;
      if (opts.inactive) patch.isActive = false;
      if (Object.keys(patch).length === 0) {
        throw new Error("Nothing to update — pass at least one field to change.");
      }
      const w = await client.updateWebhook(
        requireWorkspace(config),
        intArg(webhookId, "webhookId"),
        patch,
      );
      if (json) return printJson(w);
      console.log(color.green(`✓ updated webhook #${w.id}`));
    });

  webhooks
    .command("rm")
    .alias("delete")
    .argument("<webhookId>", "Webhook id")
    .option("-y, --yes", "Skip the confirmation prompt")
    .description("Delete a webhook")
    .action(async (webhookId: string, opts: { yes?: boolean }, command: Command) => {
      const { client, config } = context(command);
      assertWritable(config);
      if (!opts.yes) {
        throw new Error(
          `Refusing to delete webhook ${webhookId} without confirmation — re-run with --yes.`,
        );
      }
      await client.deleteWebhook(
        requireWorkspace(config),
        intArg(webhookId, "webhookId"),
      );
      console.log(color.green(`✓ deleted webhook #${webhookId}`));
    });

  webhooks
    .command("toggle")
    .argument("<webhookId>", "Webhook id")
    .description("Enable/disable a webhook")
    .action(async (webhookId: string, _opts, command: Command) => {
      const { client, config, json } = context(command);
      assertWritable(config);
      const w = await client.toggleWebhook(
        requireWorkspace(config),
        intArg(webhookId, "webhookId"),
      );
      if (json) return printJson(w);
      console.log(
        color.green(`✓ webhook #${w.id} is now ${w.isActive ? "active" : "inactive"}`),
      );
    });

  webhooks
    .command("test")
    .argument("<webhookId>", "Webhook id")
    .description("Send a test delivery")
    .action(async (webhookId: string, _opts, command: Command) => {
      const { client, config, json } = context(command);
      assertWritable(config);
      const res = await client.testWebhook(
        requireWorkspace(config),
        intArg(webhookId, "webhookId"),
      );
      if (json) return printJson(res);
      console.log(color.green(`✓ sent a test to webhook #${webhookId}`));
      if (res && typeof res === "object") {
        const r = res as { responseStatus?: number; isSuccess?: boolean };
        if (r.responseStatus != null || r.isSuccess != null) {
          console.log(
            keyValue([
              ["response", dash(r.responseStatus)],
              ["success", r.isSuccess ? "yes" : "no"],
            ]),
          );
        }
      }
    });
}
