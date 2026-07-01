FROM node:22-alpine AS builder

RUN npm install -g pnpm@10
WORKDIR /app

COPY backend/package.json backend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY backend/prisma ./prisma
COPY backend/prisma.config.ts ./
COPY backend/tsconfig.json ./
COPY backend/src ./src

RUN npx prisma generate
RUN pnpm run build

FROM node:22-alpine AS runner

RUN npm install -g pnpm@10
WORKDIR /app

ENV NODE_ENV=production
EXPOSE 4000

# Only production dependencies land in the runtime image — dev tooling
# (typescript, tsx, prisma CLI, etc.) stays out.
COPY backend/package.json backend/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# Run `npx prisma migrate deploy` as a separate release step (CI/CD) against
# DATABASE_URL before rolling out a new image — not on every container start.
CMD ["node", "dist/server.js"]
