FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app

COPY docs/package.json docs/pnpm-lock.yaml ./

# Fix for pnpm v11 (allow dependency build scripts non-interactively)
RUN echo "dangerouslyAllowAllBuilds: true" > pnpm-workspace.yaml

# Harden install against slow/flaky registries — the Scalar dependency tree is
# large. Raise timeouts/retries and lower concurrency so each request gets more
# bandwidth. A persistent BuildKit store cache reuses anything already fetched.
ENV npm_config_fetch_retries=8
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_fetch_retry_maxtimeout=180000
ENV npm_config_fetch_timeout=900000
ENV npm_config_network_concurrency=2
ENV npm_config_store_dir=/pnpm/store
# Retry within one RUN so the persistent store cache accumulates across
# attempts and can grind through a slow/flaky registry.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    n=0; until pnpm install --frozen-lockfile --trust-lockfile; do \
      n=$((n+1)); [ "$n" -ge 6 ] && echo "pnpm install failed after $n attempts" && exit 1; \
      echo "pnpm install attempt $n failed — retrying"; sleep 5; \
    done

COPY docs/tsconfig.json docs/next.config.ts ./
COPY docs/app ./app
COPY docs/components ./components
COPY docs/lib ./lib

RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Next standalone binds to $HOSTNAME; Docker sets that to the container id
# (unresolvable → EAI_AGAIN on a compose network). Force all-interfaces.
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

CMD ["node", "server.js"]
