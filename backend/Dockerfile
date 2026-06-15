FROM node:22-alpine AS builder

RUN npm install -g pnpm@10
WORKDIR /app

COPY backend/package.json backend/pnpm-lock.yaml ./
RUN pnpm install

COPY backend/prisma ./prisma
COPY backend/tsconfig.json ./
COPY backend/src ./src

RUN npx prisma generate
RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
EXPOSE 4000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

CMD ["./node_modules/.bin/tsx", "dist/server.js"]
