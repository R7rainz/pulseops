FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app

COPY backend/package.json backend/pnpm-lock.yaml ./
COPY backend/prisma ./prisma
COPY backend/src ./src
COPY backend/tsconfig.json ./

RUN pnpm install --frozen-lockfile --prod && \
    pnpm install --frozen-lockfile -D typescript @types/node && \
    npx prisma generate && \
    pnpm run build && \
    rm -rf src tsconfig.json

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
EXPOSE 4000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

CMD ["node", "dist/server.js"]
