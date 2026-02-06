# Dockerfile for @librestock/api (NestJS)
# Based on: https://www.tomray.dev/nestjs-docker-production

# Base stage with pnpm
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# Development stage - for local dev with hot reload
FROM base AS development
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/tsconfig/ ./packages/tsconfig/
COPY packages/types/package.json ./packages/types/
COPY packages/types/tsconfig.build.json packages/types/tsconfig.build.cjs.json ./packages/types/
COPY packages/types/scripts/ ./packages/types/scripts/
COPY packages/types/src/ ./packages/types/src/
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile
COPY backend/ ./backend/
WORKDIR /app/backend
CMD ["pnpm", "start:dev"]

# Build stage
FROM base AS builder
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/tsconfig/ ./packages/tsconfig/
COPY packages/types/package.json ./packages/types/
COPY packages/types/tsconfig.build.json packages/types/tsconfig.build.cjs.json ./packages/types/
COPY packages/types/scripts/ ./packages/types/scripts/
COPY packages/types/src/ ./packages/types/src/
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile
COPY backend/ ./backend/
RUN pnpm --filter @librestock/api build

# Production stage
FROM base AS production
ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/tsconfig/ ./packages/tsconfig/
COPY packages/types/package.json ./packages/types/
COPY packages/types/dist/ ./packages/types/dist/
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=builder /app/backend/dist ./backend/dist

EXPOSE 8080
WORKDIR /app/backend
CMD ["node", "dist/main"]
