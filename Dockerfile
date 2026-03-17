FROM oven/bun:1 AS builder
WORKDIR /workspace

COPY packages/types ./packages/types
COPY backend/package.json ./backend/package.json
COPY backend/bun.lock ./backend/bun.lock

WORKDIR /workspace/backend
RUN bun install --frozen-lockfile

COPY backend ./.
RUN bun run build

FROM oven/bun:1 AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /workspace/backend/dist ./dist

EXPOSE 8080
CMD ["bun", "dist/effect/main.js"]
