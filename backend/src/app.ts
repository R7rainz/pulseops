import Fastify from "fastify";
import cors from "@fastify/cors";
import { authRoutes } from "./modules/auth/auth.routes";
import { workspaceRoutes } from "./modules/workspaces/workspace.routes";
import { monitorRoutes } from "./modules/monitors/monitor.routes";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "pulseops-api",
    };
  });

  await app.register(authRoutes, {
    prefix: "/api/v1/auth",
  });

  await app.register(workspaceRoutes, {
    prefix: "/api/v1/workspaces",
  });

  await app.register(monitorRoutes, {
    prefix: "/api/v1",
  });

  return app;
}
