FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml ./

# Fix for pnpm v11
RUN echo "dangerouslyAllowAllBuilds: true" > pnpm-workspace.yaml

# Harden install against slow/flaky registries. Defaults (60s per-request
# fetch timeout, 16-way concurrency) cause "[23] operation aborted due to
# timeout" on throttled networks. Raise the timeout, add retries, and lower
# concurrency so each request gets more bandwidth. A persistent BuildKit store
# cache means re-builds reuse anything already downloaded.
ENV npm_config_fetch_retries=8
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_fetch_retry_maxtimeout=180000
ENV npm_config_fetch_timeout=900000
ENV npm_config_network_concurrency=2
ENV npm_config_store_dir=/pnpm/store
# --trust-lockfile skips pnpm 11's per-entry supply-chain re-verification
# (a slow registry crawl that also timed out here). The committed lockfile is
# part of our trusted base, which is exactly the documented use for this flag.
# Retry the install within this single RUN: the BuildKit store cache mount
# persists across attempts inside one layer, so each retry resumes from the
# tarballs the previous one already fetched — enough to grind through a slow /
# flaky registry that aborts a single pass mid-download.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    n=0; until pnpm install --frozen-lockfile --trust-lockfile; do \
      n=$((n+1)); [ "$n" -ge 6 ] && echo "pnpm install failed after $n attempts" && exit 1; \
      echo "pnpm install attempt $n failed — retrying"; sleep 5; \
    done

COPY frontend/tsconfig.json frontend/next.config.ts frontend/postcss.config.mjs frontend/eslint.config.mjs frontend/components.json frontend/middleware.ts ./
COPY frontend/app ./app
COPY frontend/components ./components
COPY frontend/hooks ./hooks
COPY frontend/lib ./lib
COPY frontend/public ./public

RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

CMD ["node", "server.js"]
