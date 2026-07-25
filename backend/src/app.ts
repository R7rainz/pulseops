// Side-effect import: teaches JSON.stringify how to handle the BigInt primary
// keys on MonitorCheck / WebhookDeliveryLog. Must come before route setup.
import "./lib/bigint-json";
import Fastify, { type FastifyInstance, type FastifyError } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import scalarApiReference from "@scalar/fastify-api-reference";
import { scalarThemeCss } from "./lib/scalar-theme";
import { ZodError } from "zod";
import { BlockedTargetError } from "./lib/ssrf";
import { ChannelConfigError } from "./modules/notifications/types";

// How long the dispatcher may go without a successful tick before this instance
// reports not-ready. Generous relative to the 15s tick so a single slow tick or
// a lost leader-lock race doesn't flap readiness.
const DISPATCH_STALE_MS = 3 * 60 * 1000;
import { authRoutes } from "./modules/auth/auth.routes";
import { workspaceRoutes } from "./modules/workspaces/workspace.routes";
import { monitorRoutes } from "./modules/monitors/monitor.routes";
import { incidentRoutes } from "./modules/incidents/incident.routes";
import { webhookRoutes } from "./modules/webhooks/webhook.routes";
import { notificationRoutes } from "./modules/notifications/notification.routes";
import { publicStatusRoutes } from "./modules/status/status.routes";
import { inviteRoutes } from "./modules/workspaces/invite.routes";
import { billingRoutes } from "./modules/billing/billing.routes";
import { startWebhookRetryWorker, stopWebhookRetryWorker } from "./workers/webhook.worker";
import { closeWebhookQueue } from "./modules/webhooks/webhook.queue";
import { connectKafka, kafkaProducer, kafkaConsumer } from "./lib/kafka";
import { startMetricsConsumer } from "./modules/telemetry/metrics.consumer";
import { startRetentionScheduler, stopRetentionScheduler } from "./modules/telemetry/retention";
import {
    getLastSuccessfulDispatchAt,
    startMonitorDispatchScheduler,
    stopMonitorDispatchScheduler,
} from "./modules/monitors/monitor.scheduler";
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

    // Key rate-limit buckets by caller identity, not IP: the Next.js server
    // proxies ALL browser traffic (server components, actions, live polling),
    // so every request arrives from one IP — an IP-keyed limit makes the whole
    // frontend share a single bucket, and one user spamming can 429 everyone's
    // reads and blank the dashboard (same story behind Caddy in production).
    // Bearer token / API key follows the actual user through any proxy; IP
    // remains the fallback for anonymous routes (login/signup brute force).
    // Route-level overrides (auth, check-now) inherit this keyGenerator.
    await app.register(rateLimit, {
        global: true,
        max: 300,
        timeWindow: "1 minute",
        keyGenerator: (request) => {
            const auth = request.headers.authorization;
            const apiKey = request.headers["x-api-key"];
            return (
                (typeof auth === "string" && auth) ||
                (typeof apiKey === "string" && apiKey) ||
                request.ip
            );
        },
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

        // A blocked target is bad user input, not a server fault — surface the
        // reason so the user can see *why* their URL was rejected.
        if (error instanceof BlockedTargetError) {
            return response.status(400).send({ message: error.message });
        }

        // Likewise a misconfigured alert channel: the adapter's message names
        // the actual problem ("must be a hooks.slack.com URL").
        if (error instanceof ChannelConfigError) {
            return response.status(400).send({ message: error.message });
        }

        request.log.error(error);
        const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
        return response.status(statusCode).send({
            message: statusCode === 500 ? "Internal server error" : error.message,
        });
    });

    // Bound every dependency probe. Without a timeout a wedged dependency makes
    // the health endpoint itself hang, which reads as a timeout to the
    // orchestrator rather than as the "degraded" it actually is.
    const withTimeout = <T>(p: Promise<T>, ms = 2000): Promise<boolean> =>
        Promise.race([
            p.then(() => true),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms)),
        ]).catch(() => false);

    // Liveness: is the process itself up? Deliberately checks nothing external —
    // a slow database must not get the container killed and restarted, which
    // only removes capacity while the database is already struggling.
    app.get("/live", async (_request, response) =>
        response.status(200).send({ status: "ok", service: "pulseops-api" }),
    );

    // Readiness: should this instance receive traffic / is the pipeline actually
    // working? Kafka is included because its absence is otherwise invisible —
    // the API stays "healthy" while silently running no checks at all.
    app.get("/ready", async (_request, response) => {
        const [dbOk, redisOk] = await Promise.all([
            withTimeout(prisma.$queryRaw`SELECT 1`),
            withTimeout(redis.ping()),
        ]);

        // The dispatcher writes a timestamp on every successful tick. If that
        // has gone stale, results have stopped flowing even though the process
        // and its datastores look fine.
        const lastDispatch = getLastSuccessfulDispatchAt();
        const dispatchAgeMs = lastDispatch ? Date.now() - lastDispatch.getTime() : null;
        const dispatchOk = dispatchAgeMs === null ? true : dispatchAgeMs < DISPATCH_STALE_MS;

        const ready = dbOk && redisOk && dispatchOk;
        return response.status(ready ? 200 : 503).send({
            status: ready ? "ok" : "degraded",
            service: "pulseops-api",
            checks: {
                database: dbOk,
                redis: redisOk,
                dispatch: dispatchOk,
                dispatchAgeMs,
            },
        });
    });

    // Kept for backwards compatibility with existing probes and compose
    // healthchecks — same semantics as /ready.
    app.get("/health", async (_request, response) => {
        const [dbOk, redisOk] = await Promise.all([
            withTimeout(prisma.$queryRaw`SELECT 1`),
            withTimeout(redis.ping()),
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

    await app.register(notificationRoutes, {
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
        startRetentionScheduler();
        startWebhookRetryWorker();

        const port = Number(process.env.PORT) || 4000;
        const host = process.env.HOST || "0.0.0.0";

        await app.listen({ port, host });
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

// Hard cap on shutdown. Any single close can hang (a wedged Kafka broker, an
// in-flight webhook retry); this guarantees the process still exits so an
// orchestrator doesn't have to SIGKILL it.
const SHUTDOWN_TIMEOUT_MS = 20000;

export function setupShutdownHandlers(app: FastifyInstance) {
    let shuttingDown = false;

    const shutdown = async (reason: string) => {
        // A second signal while already draining shouldn't restart the sequence.
        if (shuttingDown) return;
        shuttingDown = true;

        app.log.info(`[SHUTDOWN] ${reason}. Powering down tracking engines...`);

        const forceExit = setTimeout(() => {
            app.log.error("[SHUTDOWN] Timed out waiting for clean close — forcing exit.");
            process.exit(1);
        }, SHUTDOWN_TIMEOUT_MS);
        forceExit.unref();

        // Stop taking on new work first, then close consumers, then the things
        // they depend on. Each step is isolated so one failure can't strand the
        // rest — previously the BullMQ worker, both extra Redis connections and
        // Prisma were simply never closed.
        const step = async (label: string, fn: () => Promise<unknown>) => {
            try {
                await fn();
            } catch (error) {
                app.log.error(`[SHUTDOWN] ${label} failed: ${(error as Error).message}`);
            }
        };

        stopMonitorDispatchScheduler();
        stopHeartbeatScheduler();
        stopRetentionScheduler();

        await step("HTTP server close", () => app.close());
        await step("Kafka producer disconnect", () => kafkaProducer.disconnect());
        await step("Kafka consumer disconnect", () => kafkaConsumer.disconnect());
        await step("Webhook worker close", () => stopWebhookRetryWorker());
        await step("Webhook queue close", () => closeWebhookQueue());
        await step("Redis quit", () => redis.quit());
        await step("Prisma disconnect", () => prisma.$disconnect());

        clearTimeout(forceExit);
        app.log.info("[SHUTDOWN] Clean shutdown complete.");
        process.exit(0);
    };

    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
    signals.forEach((signal) => {
        process.on(signal, () => void shutdown(`Intercepted ${signal}`));
    });

    // Previously unhandled: these terminated the process (or, for rejections,
    // silently continued) without closing anything.
    process.on("unhandledRejection", (reason) => {
        app.log.error({ reason }, "[SHUTDOWN] Unhandled promise rejection");
    });

    process.on("uncaughtException", (error) => {
        app.log.error(error, "[SHUTDOWN] Uncaught exception — shutting down");
        void shutdown("Uncaught exception");
    });
}
