FROM node:24-alpine AS types-builder
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /workspace/packages

COPY packages/package.json ./package.json
COPY packages/pnpm-lock.yaml ./pnpm-lock.yaml
COPY packages/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY packages/types ./types

RUN pnpm install --frozen-lockfile
RUN pnpm --dir types build

FROM oven/bun:1 AS builder
WORKDIR /workspace

COPY backend/package.json ./backend/package.json
COPY backend/bun.lock ./backend/bun.lock
COPY --from=types-builder /workspace/packages/types ./packages/types

WORKDIR /workspace/backend
RUN bun install --frozen-lockfile

COPY backend ./
RUN bun run build

FROM oven/bun:1 AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /workspace/backend/dist ./dist

EXPOSE 8080
CMD ["bun", "dist/effect/main.js"]
