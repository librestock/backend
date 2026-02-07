# LibreStock API

REST API for LibreStock inventory management, built with NestJS.

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- PostgreSQL 16

This repo is part of the [LibreStock workspace](https://github.com/librestock/meta). Dependencies must be installed from the workspace root.

## Getting Started

```bash
# From the workspace root (libre/):
pnpm install

# Copy env template and set BETTER_AUTH_SECRET
cp backend/.env.template backend/.env

# Start in dev mode (needs PostgreSQL running)
pnpm --filter @librestock/api start:dev
```

The API will be at http://localhost:8080. Swagger docs at http://localhost:8080/api/docs.

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

```
src/
├── main.ts                  # Bootstrap, global prefix /api/v1
├── app.module.ts            # Root module
├── app.routes.ts            # Route registration
├── config/                  # DB config
├── common/
│   ├── decorators/          # @Transactional, @StandardThrottle, @Roles
│   ├── dto/                 # BaseResponseDto, ErrorResponseDto
│   ├── entities/            # BaseEntity, BaseAuditEntity
│   ├── guards/              # RolesGuard
│   ├── hateoas/             # HATEOAS link system
│   ├── interceptors/        # Logging, Transaction, Audit
│   └── middleware/          # RequestIdMiddleware
└── routes/
    ├── auth/                # /api/v1/auth/*
    ├── categories/          # /api/v1/categories/*
    ├── products/            # /api/v1/products/*
    ├── locations/           # /api/v1/locations/*
    ├── areas/               # /api/v1/areas/*
    ├── inventory/           # /api/v1/inventory/*
    ├── audit-logs/          # /api/v1/audit-logs/* (admin only)
    ├── users/               # /api/v1/users/* (admin only)
    ├── branding/            # /api/v1/branding/*
    └── health/              # /health-check (no auth)
```

## Commands

```bash
pnpm start:dev          # Dev server with hot reload
pnpm build              # Production build
pnpm start:prod         # Run production build
pnpm test               # Unit tests (Jest 30)
pnpm test:e2e           # E2E tests (needs running DB)
pnpm test:cov           # Coverage report
pnpm lint               # ESLint
pnpm type-check         # TypeScript check
```

## Authentication

All `/api/v1/*` endpoints require Better Auth authentication (global guard). Health checks at `/health-check` are unauthenticated.

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/products
```

## License

AGPL-3.0
