# Deploying PulseOps (single VPS + Docker Compose)

The whole stack — web, API, docs, Postgres, Redis, Kafka, ping engine — runs on
one Linux box with Docker, behind Caddy for automatic HTTPS. This is the
supported production path; it reuses `docker-compose.prod.yml` (see the
[root README](./README.md#deploy-to-a-real-domain-https)).

> **Not Vercel/serverless.** The ping engine (60s cron loop), Kafka broker and
> queue workers are always-on, stateful processes — they can't run on a
> serverless platform. Put the *frontend* on Vercel if you like, but the backend
> needs a real always-on host.

## 0. What you need

- A **VPS**, Ubuntu 22.04/24.04, **≥ 4 GB RAM**, **≥ 2 vCPU**, ~20 GB disk.
  Kafka alone wants ~1 GB. Good options:
  - **Hetzner CX22** (~€4/mo, amd64) — cheapest solid choice.
  - **DigitalOcean / Linode** 4 GB droplet (~$24/mo).
  - **Oracle Cloud Always-Free** ($0) — see the ⚠️ ARM note below.
- A **domain** (or subdomain) you can add a DNS record to. Needed for HTTPS and
  OAuth. ~$10/yr (Cloudflare/Porkbun/Namecheap), or a free `*.sslip.io` /
  DuckDNS name for testing.
- Inbound **80** and **443** open (and 22 for SSH).

> **Architecture:** both **amd64** and **arm64** work — every image in the stack
> (incl. `confluentinc/cp-kafka:7.5.0`, `postgres`, `redis`, `caddy`) ships an
> arm64 build, and the Node images build natively on the host. So Oracle Cloud's
> free **ARM (Ampere)** VM runs the full stack unchanged.

## 1. Point DNS at the host

Create an **A record**: `your.domain` → `<server public IP>` (and `AAAA` if you
have IPv6). Verify it resolves before continuing:

```bash
dig +short your.domain      # should print the server IP
```

## 2. Install Docker on the server

SSH in, then:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # log out/in so `docker` works without sudo
docker compose version            # expect v2.24+
```

## 3. Get the code

```bash
git clone https://github.com/R7rainz/pulseops.git
cd pulseops
```

## 4. Configure `.env`

```bash
cp .env.example .env
```

Edit `.env` and set (see comments in the file):

```bash
JWT_SECRET=<paste `openssl rand -hex 32`>
DOMAIN=your.domain
APP_URL=https://your.domain
FRONTEND_URL=https://your.domain
PUBLIC_API_URL=https://your.domain
OAUTH_CALLBACK_BASE=https://your.domain
DOCS_URL=https://your.domain/docs
# Optional: strong DB password for a public host
POSTGRES_PASSWORD=<random>
```

For Google/GitHub login or email (magic links/invites), also create
`backend/.env` with those secrets — it's loaded automatically if present. The
OAuth **redirect URI** you register with the provider must be
`https://your.domain/api/v1/auth/<provider>/callback`.

## 5. Build and start

`PUBLIC_API_URL` / `APP_URL` / `DOCS_URL` are baked into the web/docs bundles at
build time, so **build first**, then bring it up:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

First boot: Kafka formats storage (~30–45s), the one-shot `migrate` service
applies all Prisma migrations, then `api` starts. Caddy provisions the TLS
certificate on the first HTTPS request.

## 6. Verify

```bash
# from the server
curl -fsS http://localhost:4000/health && echo OK        # API up
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps   # all healthy

# from anywhere
curl -fsS https://your.domain/api/v1/../health            # (or just open the site)
```

Open `https://your.domain` → sign up → create a monitor. Point the npm CLI at it:

```bash
PULSEOPS_API_URL=https://your.domain pulseops login
```

## Operating it

```bash
# alias to save typing
alias dc='docker compose -f docker-compose.yml -f docker-compose.prod.yml'

dc logs -f api ping-engine     # tail logs
dc ps                          # status/health
dc pull && dc up -d            # (if using prebuilt images)

# deploy an update
git pull
dc build && dc up -d           # rebuild changed images and restart
```

## Troubleshooting

- **Cert won't issue** → DNS not pointing at the host yet, or 80/443 blocked.
  Confirm `dig +short your.domain` = server IP and the firewall/security-group
  allows 80+443. On **Oracle Cloud** you must open them in **both** the VCN
  security list **and** the instance's OS firewall (`iptables`/`firewalld`).
- **Kafka `exec format error` / image pull fails on ARM** → the ARM caveat above;
  switch to `apache/kafka`.
- **OAuth redirect mismatch** → the provider's redirect URI must exactly match
  `https://your.domain/api/v1/auth/<provider>/callback`.
- **Out of memory / Kafka flapping** → the box is under ~4 GB; size up, or take
  the "make Kafka optional" path so the stack is lighter.
- **502 from the site** → `api` still starting or migrations running; `dc logs api`.
