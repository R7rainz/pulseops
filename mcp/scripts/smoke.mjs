// Spins up the built MCP server over stdio, lists its tools, and calls a few.
// Requires PULSEOPS_API_URL / PULSEOPS_API_KEY / PULSEOPS_WORKSPACE in env.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const serverEntry = resolve(here, "../dist/index.js");

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry],
  env: { ...process.env },
  stderr: "inherit",
});

const client = new Client({ name: "smoke", version: "0.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(`\nTOOLS (${tools.length}):`);
for (const t of tools) console.log(`  ${t.name} — readOnly=${t.annotations?.readOnlyHint}`);

async function call(name, args = {}) {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content.map((c) => c.text).join("");
  const preview = text.length > 240 ? text.slice(0, 240) + "…" : text;
  console.log(`\n${name}(${JSON.stringify(args)}) isError=${res.isError ?? false}\n${preview}`);
}

await call("pulseops_list_monitors");
await call("pulseops_get_monitor_stats", { monitorId: 6 });
await call("pulseops_get_monitor", { monitorId: 999999 }); // expect isError

await client.close();
console.log("\nsmoke OK");
