import Fastify from "fastify";
import cors from "@fastify/cors";
import { authRoutes } from "./modules/auth/auth.routes";
import { workspaceRoutes } from "./modules/workspaces/workspace.routes";
import { monitorRoutes } from "./modules/monitors/monitor.routes";
import { incidentRoutes } from "./modules/incidents/incident.routes";
import { webhookRoutes } from "./modules/webhooks/webhook.routes";
import { publicStatusRoutes } from "./modules/status/status.routes";
import { inviteRoutes } from "./modules/workspaces/invite.routes";
import { startPingEngine } from "./modules/monitors/monitor.engine";

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

  await app.register(incidentRoutes, {
    prefix: "/api/v1",
  });

  await app.register(webhookRoutes, {
    prefix: "/api/v1",
  });

  await app.register(publicStatusRoutes, {
    prefix: "/api/v1/status",
  });

  await app.register(inviteRoutes, {
    prefix: "/api/v1",
  });

  startPingEngine();
  return app;
}
