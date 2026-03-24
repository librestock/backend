# LibreStock API

REST API for LibreStock inventory management, built with Effect, Drizzle, Better Auth, and Bun.

## Prerequisites

- Bun >= 1.0
- PostgreSQL 16

This repo is part of the [LibreStock workspace](https://github.com/librestock/meta). In the workspace bootstrap flow, `backend/` uses Bun for dependency installation and script execution.

## Getting Started

```bash
# From backend/
bun install

# Copy env template and set BETTER_AUTH_SECRET
cp .env.template .env

# Start in dev mode (needs PostgreSQL running)
bun run start
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
│   ├── main.ts            # Bun entrypoint and layer wiring
│   ├── http/              # HTTP app, middleware, logging, security headers
│   ├── modules/           # Routers, services, repositories, schemas, errors
│   └── platform/          # Drizzle, Better Auth, request/session/audit helpers
├── auth.ts                # Better Auth setup
├── scripts/               # Seed/import scripts
└── migrations/            # TypeORM migrations still used for legacy schema flow
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
bun install              # Install backend dependencies
bun run start            # Run the API
bun run build            # Production build
bun run start:prod       # Run production build
bun run test             # Unit tests (Jest)
bun run test:e2e         # E2E tests
bun run lint             # ESLint
bun run type-check       # TypeScript check
bun run seed             # Seed database
```

## Shared Types

Shared API contracts live in the separate `packages` repo as `@librestock/types`.

When request/response shapes change:

1. update `packages/types`
2. publish the new `@librestock/types` version
3. bump the dependency in this repo

## Authentication

All `/api/v1/*` endpoints require Better Auth authentication except the health check route.

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/products
```

## License

AGPL-3.0
