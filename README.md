# PulseOps

Self-hostable uptime & latency monitoring — HTTP/heartbeat checks, incidents,
SLA analytics, a web dashboard, a read-only programmatic API, and a terminal
app ([`pulseops`](./cli) on npm: CLI + live TUI dashboard).

## Run it locally

One command brings up the whole stack (web, API, docs, Postgres, Redis, Kafka,
ping engine) and applies migrations automatically:

```bash
docker compose up --build
```

- Web app → http://localhost:3000
- API → http://localhost:4000 (`/api/v1`, OpenAPI at `/docs/openapi.json`)
- API docs → http://localhost:3001

It works with zero configuration. To customise anything (auth secret, DB creds,
OAuth/SMTP, public URLs), `cp .env.example .env` and edit — see the comments in
[`.env.example`](./.env.example).

## Deploy to a real domain (HTTPS)

The `docker-compose.prod.yml` overlay puts [Caddy](https://caddyserver.com) in
front of the stack with **automatic Let's Encrypt TLS** and one-domain,
path-based routing. The app services come off the public interface — only Caddy
listens on 80/443.

```
https://your.domain/       → web app
https://your.domain/api/v1 → API (+ OAuth callbacks)
https://your.domain/docs   → API reference
```

**Prerequisites:** a public DNS record for `your.domain` pointing at the host,
inbound `80`/`443` open, and Docker Compose v2.24+.

1. Configure `.env` (copied from `.env.example`):

   ```bash
   JWT_SECRET=$(openssl rand -hex 32)
   DOMAIN=your.domain
   APP_URL=https://your.domain
   FRONTEND_URL=https://your.domain
   PUBLIC_API_URL=https://your.domain
   OAUTH_CALLBACK_BASE=https://your.domain
   DOCS_URL=https://your.domain/docs
   ```

2. Build and start (the **build** step is required — `PUBLIC_API_URL` / `APP_URL`
   / `DOCS_URL` are baked into the web/docs client bundles at build time, so
   changing them later means rebuilding, not just restarting):

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml build
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

Caddy provisions and renews the certificate automatically; certs persist in the
`caddy_data` volume. To enable OAuth/SMTP, drop the real secrets in
`backend/.env` (loaded automatically) — see [`.env.example`](./.env.example).

For a full step-by-step runbook — including a **$0 / free-tier** path (Oracle
Cloud Always-Free VM + a free DuckDNS domain) — see **[DEPLOY.md](./DEPLOY.md)**.

> **Note:** PulseOps is **self-hosted** — there's no public/hosted instance to
> sign up for. Run your own with the steps above; the [`pulseops`](./cli) npm CLI
> then connects to it via `PULSEOPS_API_URL`.

## Repository layout

New to the codebase? **[ARCHITECTURE.md](./ARCHITECTURE.md)** is a guided reading
path — what each part does, the order to read it in, and why the pieces are split
the way they are.

| Path | What |
| --- | --- |
| [`backend/`](./backend) | Fastify API, Prisma/Postgres, BullMQ, Kafka dispatch scheduler |
| [`frontend/`](./frontend) | Next.js web dashboard |
| [`workers/ping-engine/`](./workers/ping-engine) | Kafka-driven probe workers (HTTP, TCP, DNS, keyword) |
| [`cli/`](./cli) | `pulseops` — the terminal CLI + TUI dashboard (published to npm) |
| [`mcp/`](./mcp) | Model Context Protocol server over the read API |
| [`docs/`](./docs) | API-reference app (Scalar over the OpenAPI spec) |
