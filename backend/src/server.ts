import "dotenv/config";
import { buildApp, start, setupShutdownHandlers } from "./app";

async function main() {
  const app = await buildApp();
  setupShutdownHandlers(app);
  await start(app);
}

main();
