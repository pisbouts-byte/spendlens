# Stage 1: Build shared + server + client
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY shared/package.json shared/tsconfig.json ./shared/
COPY server/package.json server/tsconfig.json ./server/
COPY client/package.json client/tsconfig.json client/vite.config.ts client/postcss.config.js client/tailwind.config.ts ./client/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY shared/ ./shared/
COPY server/ ./server/
COPY client/ ./client/

# Build shared first, then server + client
RUN pnpm --filter @spendlens/shared build
RUN pnpm --filter @spendlens/server exec tsc --outDir dist
RUN pnpm --filter @spendlens/client build

# Stage 2: Server runtime
FROM node:22-alpine AS server

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/server/package.json ./server/

# Production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/shared/dist/ ./shared/dist/
COPY --from=builder /app/server/dist/ ./server/dist/
COPY --from=builder /app/server/prisma/ ./server/prisma/

# Copy client build to serve statically
COPY --from=builder /app/client/dist/ ./client/dist/

# Generate Prisma client
RUN cd server && npx prisma generate

WORKDIR /app/server

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/index.js"]
