# LibreStock API

REST API for LibreStock inventory management, built with Effect, Drizzle, Better Auth, and Node.js.

## Prerequisites

- Node.js 22
- pnpm 10.28.0 via Corepack
- PostgreSQL 16

This repo is a pnpm workspace. A single `pnpm install` from the workspace root installs the API and local LibreStock packages under `packages/`.

## Getting Started

```bash
# From the workspace root
pnpm install

# Copy env template and set BETTER_AUTH_SECRET
cp .env.template .env

# Start in dev mode (needs PostgreSQL running)
pnpm start
```

The API will be at `http://localhost:8080`.

### Environment Variables

```env
PORT=8080
BETTER_AUTH_SECRET=<random 32+ byte string>
BETTER_AUTH_URL=http://localhost:8080
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Database (URL or individual vars)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/librestock_inventory
# OR
PGHOST=localhost  PGPORT=5432  PGUSER=postgres  PGPASSWORD=postgres  PGDATABASE=librestock_inventory
```

## Project Structure

```text
src/
├── effect/
│   ├── main.ts            # Node entrypoint and layer wiring
│   ├── http/              # HTTP app, middleware, logging, security headers
│   ├── modules/           # Routers, services, repositories, schemas, errors
│   └── platform/          # Drizzle, Better Auth, request/session/audit helpers
├── auth.ts                # Better Auth setup
└── scripts/               # Seed/import scripts
test/
└── mocks/                 # Auth/UUID test helpers
```

Most business features live under `src/effect/modules/<feature>/` with the pattern:

- `router.ts`: HTTP boundary
- `service.ts`: application logic
- `repository.ts`: DB access
- `*.schema.ts`: request/query decoding
- `*.errors.ts`: tagged domain/infrastructure errors

## Commands

```bash
pnpm install             # Install the workspace
pnpm start               # Run the API
pnpm build               # Production build
pnpm start:prod          # Run production build
pnpm test                # Unit tests (Vitest)
pnpm test:integration    # Integration tests
pnpm lint                # Oxlint
pnpm type-check          # TypeScript check
pnpm seed                # Seed database
```

## Shared Types

Shared API contracts live in this workspace as `@librestock/types`.

When request/response shapes change:

1. update `packages/types`
2. run `pnpm --filter @librestock/types barrels`
3. run `pnpm --filter @librestock/types build`
4. use the workspace-linked package directly from the API

## Authentication

All `/api/v1/*` endpoints require Better Auth authentication except the health check route.

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/products
```
