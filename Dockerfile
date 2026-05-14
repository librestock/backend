FROM node:22-bookworm AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@10.28.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
RUN pnpm install --frozen-lockfile

COPY src ./src
COPY drizzle ./drizzle
COPY drizzle.config.ts tsconfig.json tsconfig.build.json ./
RUN pnpm run build \
  && rm -rf /tmp/librestock-api \
  && pnpm deploy --prod --legacy --filter=@librestock/api /tmp/librestock-api \
  && cp -a dist drizzle drizzle.config.ts /tmp/librestock-api/

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /tmp/librestock-api ./

EXPOSE 4000
CMD ["node", "dist/effect/main.mjs"]
