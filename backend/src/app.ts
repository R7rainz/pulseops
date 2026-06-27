import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { authRoutes } from "./modules/auth/auth.routes";
import { workspaceRoutes } from "./modules/workspaces/workspace.routes";
import { monitorRoutes } from "./modules/monitors/monitor.routes";
import { incidentRoutes } from "./modules/incidents/incident.routes";
import { webhookRoutes } from "./modules/webhooks/webhook.routes";
import { publicStatusRoutes } from "./modules/status/status.routes";
import { inviteRoutes } from "./modules/workspaces/invite.routes";
import { billingRoutes } from "./modules/billing/billing.routes";
import { connectKafka, kafkaProducer, kafkaConsumer } from "./lib/kafka";
import { startMetricsConsumer } from "./modules/telemetry/metrics.consumer";
import { startScheduler, stopScheduler } from "./modules/monitors/monitor.scheduler";
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

    await app.register(billingRoutes, {
        prefix: "/api/v1",
    });

    return app;
}

export async function start(app: FastifyInstance) {
    try {
        await connectKafka();
        await startMetricsConsumer();
        startScheduler(60000);
        startPingEngine();

        const port = Number(process.env.PORT) || 4000;
        const host = process.env.HOST || "0.0.0.0";

        await app.listen({ port, host });
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

export function setupShutdownHandlers(app: FastifyInstance) {
    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
    signals.forEach((signal) => {
        process.on(signal, async () => {
            app.log.info(`[SHUTDOWN] Intercepted ${signal}. Powering down tracking engines...`);
            stopScheduler();
            await kafkaProducer.disconnect();
            await kafkaConsumer.disconnect();
            await app.close();
            process.exit(0);
        });
    });
}
