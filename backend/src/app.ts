import Fastify, { type FastifyInstance, type FastifyError } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import scalarApiReference from "@scalar/fastify-api-reference";
import { scalarThemeCss } from "./lib/scalar-theme";
import { ZodError } from "zod";
import { authRoutes } from "./modules/auth/auth.routes";
import { workspaceRoutes } from "./modules/workspaces/workspace.routes";
import { monitorRoutes } from "./modules/monitors/monitor.routes";
import { incidentRoutes } from "./modules/incidents/incident.routes";
import { webhookRoutes } from "./modules/webhooks/webhook.routes";
import { publicStatusRoutes } from "./modules/status/status.routes";
import { inviteRoutes } from "./modules/workspaces/invite.routes";
import { billingRoutes } from "./modules/billing/billing.routes";
import { startWebhookRetryWorker } from "./workers/webhook.worker";
import { connectKafka, kafkaProducer, kafkaConsumer } from "./lib/kafka";
import { startMetricsConsumer } from "./modules/telemetry/metrics.consumer";
import { startMonitorDispatchScheduler, stopMonitorDispatchScheduler } from "./modules/monitors/monitor.scheduler";
import { startHeartbeatScheduler, stopHeartbeatScheduler } from "./modules/monitors/heartbeat.scheduler";
import { prisma } from "./lib/db";
import { redis } from "./lib/redis";

export async function buildApp() {
    const app = Fastify({
        logger: true,
    });

    const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
        .split(",")
        .map((origin) => origin.trim());

    await app.register(cors, {
        origin: allowedOrigins,
        credentials: true,
    });

    await app.register(rateLimit, {
        global: true,
        max: 100,
        timeWindow: "1 minute",
    });

    // OpenAPI docs for the programmatic API. Registered before routes so its
    // onRoute hook captures them. Only routes that declare `schema.tags` are
    // included in the spec (see transform) — that's the key-authed surface;
    // internal browser-only endpoints stay out of the public docs.
    await app.register(swagger, {
        openapi: {
            info: {
                title: "PulseOps API",
                description:
                    "Programmatic access to PulseOps monitors and incidents. " +
                    "Authenticate with a workspace API key via the `x-api-key` header " +
                    "(create one in Settings → API Keys). v1 keys are read-only.",
                version: "1.0.0",
            },
            servers: [
                { url: process.env.PUBLIC_API_URL || "http://localhost:4000" },
            ],
            components: {
                securitySchemes: {
                    apiKey: {
                        type: "apiKey",
                        name: "x-api-key",
                        in: "header",
                        description: "Workspace API key (prefixed `po_`).",
                    },
                    bearerAuth: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT",
                        description: "Session token used by the PulseOps web app.",
                    },
                },
            },
            tags: [
                { name: "Monitors", description: "Monitor config, live state, checks, stats and SLA analytics." },
                { name: "Incidents", description: "Incident history." },
                { name: "Heartbeat", description: "Push liveness signals for HEARTBEAT monitors." },
            ],
        },
        transform: ({ schema, url }: { schema: any; url: string }) => {
            const documented =
                schema && Array.isArray(schema.tags) && schema.tags.length > 0;
            return documented
                ? { schema, url }
                : { schema: { ...(schema || {}), hide: true }, url };
        },
    });

    // Scalar renders the spec as a classic docs site: left sidebar grouped by
    // tag, ⌘/Ctrl-K search, per-endpoint pages with request/response examples.
    // It sources the OpenAPI document from @fastify/swagger above.
    await app.register(scalarApiReference, {
        routePrefix: "/docs",
        configuration: {
            pageTitle: "PulseOps API",
            theme: "default",
            // Default to dark (the app's default) but keep the toggle so the
            // docs can switch to light like the rest of the site.
            darkMode: true,
            customCss: scalarThemeCss,
        },
    });

    app.setErrorHandler((error: FastifyError | ZodError, request, response) => {
        if (error instanceof ZodError) {
            const messages = error.issues.map((issue) => issue.message).join("; ");
            return response.status(400).send({ message: messages || "Invalid input" });
        }

        request.log.error(error);
        const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
        return response.status(statusCode).send({
            message: statusCode === 500 ? "Internal server error" : error.message,
        });
    });

    app.get("/health", async (_request, response) => {
        const [dbOk, redisOk] = await Promise.all([
            prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
            redis.ping().then(() => true).catch(() => false),
        ]);

        const healthy = dbOk && redisOk;
        return response.status(healthy ? 200 : 503).send({
            status: healthy ? "ok" : "degraded",
            service: "pulseops-api",
            checks: { database: dbOk, redis: redisOk },
        });
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
        // Automatic monitor checks flow through Kafka to workers/ping-engine
        // (the Go service). If Kafka is unreachable, connectKafka() logs and
        // continues rather than crashing the API — but no automatic checks
        // will run until it's back. The "check now" endpoint always works
        // regardless, since it pings locally instead of going through Kafka.
        await connectKafka();
        await startMetricsConsumer();
        startMonitorDispatchScheduler();
        startHeartbeatScheduler();
        startWebhookRetryWorker();

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
            stopMonitorDispatchScheduler();
            stopHeartbeatScheduler();
            try { await kafkaProducer.disconnect(); } catch {}
            try { await kafkaConsumer.disconnect(); } catch {}
            await app.close();
            process.exit(0);
        });
    });
}
