# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

RUN npm install -g pnpm@12.3.4
WORKDIR /app

COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pulseops-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --fetch-timeout=300000

COPY backend/prisma ./prisma
COPY backend/prisma.config.ts ./
COPY backend/tsconfig.json ./
COPY backend/src ./src

RUN npx prisma generate
RUN pnpm run build

FROM builder AS production-deps

RUN pnpm prune --prod

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
EXPOSE 4000

# Only production dependencies land in the runtime image — dev tooling
# (typescript, tsx, prisma CLI, etc.) stays in the builder stage.
COPY --from=production-deps /app/node_modules ./node_modules

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# Run `npx prisma migrate deploy` as a separate release step (CI/CD) against
# DATABASE_URL before rolling out a new image — not on every container start.
CMD ["node", "dist/server.js"]
