// Dumps the runtime OpenAPI document (produced by @fastify/swagger) to a file
// the Mintlify docs project reads. buildApp() only registers routes/plugins —
// Kafka/DB connections happen in start(), so booting it here is cheap and safe.
// Re-run and commit whenever the documented API surface changes:
//   pnpm openapi:dump
import "dotenv/config"; // route modules read env (JWT_SECRET, etc.) at import time
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildApp } from "../src/app";

const OUT = join(__dirname, "../../docs/api-reference/openapi.json");

async function main() {
    const app = await buildApp();
    await app.ready();
    const spec = app.swagger();
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(spec, null, 2) + "\n");
    await app.close();
    console.log(`Wrote OpenAPI spec → ${OUT}`);
}

main()
    // ioredis (imported transitively via routes) opens a connection that keeps
    // the event loop alive, so exit explicitly once the file is written.
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
