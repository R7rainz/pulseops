# PulseOps

Developer-first uptime & API monitoring you run from your terminal — and your
AI agent. Self-hostable in one command.

PulseOps watches your HTTP endpoints and heartbeat jobs, records latency/uptime,
opens incidents when things break, and exposes everything through a web app, a
programmatic API, a CLI, a terminal dashboard, and an MCP server for LLM agents.

## Run it — one command

Requires [Docker](https://docs.docker.com/get-docker/) (with Compose v2.24+).

```bash
git clone https://github.com/R7rainz/pulseops.git
cd pulseops
docker compose up
```

That's it. Compose builds the images, starts Postgres/Redis/Kafka, **applies
database migrations automatically**, and brings up the whole stack. First run
takes a few minutes to build; subsequent runs are fast. Add `-d` to run
detached.

Then open:

| Service        | URL                     | What                              |
| -------------- | ----------------------- | --------------------------------- |
| Web app        | http://localhost:3000   | Sign up and add your first monitor |
| API            | http://localhost:4000   | Programmatic REST API             |
| API docs       | http://localhost:3001   | OpenAPI reference (Scalar)         |

Sign up with email + password — no external services required. (Magic-link and
invite emails are printed to the API logs unless you configure SMTP.)

Stop with `Ctrl-C`; `docker compose down` removes the containers (your data
persists in the `pulseops_postgres_data` volume). `docker compose down -v` wipes
data too.

## Configuration (optional)

The stack runs out of the box with safe local defaults — **no `.env` needed**.
To customise a deployment, copy the example and edit it:

```bash
cp .env.example .env
```

> ⚠️ **If your instance is reachable by anyone but you, set a real `JWT_SECRET`**
> (`openssl rand -hex 32`). The built-in default is shared and public.

Optional features — social login (Google/GitHub/Microsoft), SMTP email, and
billing — are off by default; enable them by adding their secrets to
`backend/.env`. See [`.env.example`](.env.example) and
[`backend/CLAUDE.md`](backend/CLAUDE.md).

### Hosting on a real domain

Set `APP_URL` / `FRONTEND_URL` (web) and `PUBLIC_API_URL` / `OAUTH_CALLBACK_BASE`
(API) in your root `.env` to your public URLs before `docker compose up`.

## What's in the box

| Path                    | What it is                                              |
| ----------------------- | ------------------------------------------------------- |
| `backend/`              | Fastify API, Prisma/Postgres, Kafka dispatch, auth/2FA  |
| `frontend/`             | Next.js web app                                         |
| `workers/ping-engine/`  | Go worker that runs the checks concurrently             |
| `docs/`                 | Self-hosted OpenAPI reference (Scalar)                  |
| `cli/`                  | [`@pulseops/cli`](cli/) — terminal client for the API   |
| `tui/`                  | [`@pulseops/tui`](tui/) — full-screen terminal dashboard |
| `mcp/`                  | [`@pulseops/mcp`](mcp/) — MCP server for LLM agents      |

## Architecture

Monitor checks converge on one engine from two paths: a **Kafka-dispatched** Go
`ping-engine` pings due monitors concurrently and publishes results back for the
API to persist, while an **on-demand** "check now" pings locally — so manual
checks work even if the engine is down. Live status is cached in Redis; uptime,
latency percentiles and incidents are computed from the check history in
Postgres.

## Development

Each package has its own README/CLAUDE.md and runs standalone (`pnpm dev` in
`backend/` and `frontend/`, `go run` in the ping engine). `docker compose up` is
the quickest way to get the full pipeline — including automatic checks — running
together.
