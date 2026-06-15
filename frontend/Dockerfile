FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml ./

# Fix for pnpm v11
RUN echo "dangerouslyAllowAllBuilds: true" > pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

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
