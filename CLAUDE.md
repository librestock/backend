# LibreStock API Module - Agent Context

> NestJS REST API for LibreStock - open source inventory management.

## Tech Stack

NestJS 11 · TypeORM 0.3 · PostgreSQL 16 · Better Auth · class-validator · Swagger

## Directory Structure

```
modules/api/src/
├── main.ts                 # Bootstrap, global prefix /api/v1
├── app.module.ts           # Root module
├── app.routes.ts           # Route registration
├── config/database.config.ts
├── common/
│   ├── decorators/         # @Transactional, @StandardThrottle, @Roles
│   ├── dto/                # BaseResponseDto, ErrorResponseDto
│   ├── entities/           # BaseEntity, BaseAuditEntity
│   ├── enums/              # AuditAction, UserRole
│   ├── filters/            # ThrottlerExceptionFilter
│   ├── guards/             # RolesGuard
│   ├── hateoas/            # @HateoasLinks, HateoasInterceptor
│   ├── interceptors/       # LoggingInterceptor, TransactionInterceptor, AuditInterceptor
│   └── middleware/         # RequestIdMiddleware
└── routes/
    ├── auth/               # /api/v1/auth/*
    ├── categories/         # /api/v1/categories/*
    ├── products/           # /api/v1/products/*
    ├── locations/          # /api/v1/locations/*
    ├── areas/              # /api/v1/areas/*
    ├── inventory/          # /api/v1/inventory/*
    ├── audit-logs/         # /api/v1/audit-logs/*
    ├── branding/           # /api/v1/branding/*
    ├── users/              # /api/v1/users/* (admin only)
    ├── suppliers/          # Entity only, no endpoints yet
    └── health/             # /health-check (no auth)
```

## Module Pattern

Each feature module follows:

```
<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.repository.ts
├── <feature>.hateoas.ts      # HATEOAS link definitions
├── entities/<feature>.entity.ts
└── dto/
    ├── create-<feature>.dto.ts
    ├── update-<feature>.dto.ts
    ├── <feature>-response.dto.ts
    └── <feature>-query.dto.ts
```

**Dependency flow:** Controller → Service → Repository → TypeORM → PostgreSQL

**Module export rule:** Modules only export their Service, never the Repository. Cross-module access must go through the Service layer (e.g., `ProductsService` calls `CategoriesService`, not `CategoryRepository`).

## Key Conventions

### Base Entities

- `BaseEntity`: `created_at`, `updated_at`
- `BaseAuditEntity`: Adds `deleted_at`, `created_by`, `updated_by`, `deleted_by` (soft delete + audit)

### DTOs

- Response DTOs extend `BaseResponseDto` or `BaseAuditResponseDto`
- Use `@ApiProperty()` on all fields for Swagger
- Validation via class-validator decorators

### Authentication & Authorization

- All `/api/v1/*` routes require Better Auth (global guard)
- Access session: `@Session()` from `@thallesp/nestjs-better-auth`
- Better Auth `admin()` plugin enabled in `src/auth.ts` — provides `auth.api.listUsers()`, `banUser()`, `unbanUser()`, `removeUser()`, `revokeUserSessions()`
- **DB-backed roles:** `RolesGuard` queries the `user_roles` table (not session claims). Falls back to session roles if DB returns nothing.
- The `user_roles` table uses a PostgreSQL enum (`user_role_enum`) and has a unique constraint on `(user_id, role)`
- `DB_SYNCHRONIZE` env var is `false` by default — new tables must be created manually or by setting `DB_SYNCHRONIZE=true`. **Blocked in production** regardless of env var.
- **All `:id` path params** must use `ParseUUIDPipe` for validation
- **Enum path params** (like `entityType`) must use `ParseEnumPipe`
- **Admin-only endpoints** must have `@UseGuards(RolesGuard)` + `@Roles(UserRole.ADMIN)` — currently applied to: AuditLogs, Users, Branding PUT

### HATEOAS

The `HateoasInterceptor` automatically prepends `{protocol}://{host}/api/v1` to all link hrefs. Hateoas definition files use relative paths (without the `/api/v1` prefix):

```typescript
// products.hateoas.ts
export const PRODUCT_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'self', href: (data) => `/products/${data.id}`, method: 'GET' },
  { rel: 'update', href: (data) => `/products/${data.id}`, method: 'PUT' },
  { rel: 'delete', href: (data) => `/products/${data.id}`, method: 'DELETE' },
];
export const ProductHateoas = () => HateoasLinks(...PRODUCT_HATEOAS_LINKS);
```

Usage in controller:

```typescript
@Get(':id')
@UseInterceptors(HateoasInterceptor)
@ProductHateoas()
async findOne(@Param('id') id: string) { ... }
```

### Soft Delete

Products use soft delete via `BaseAuditEntity`. Repositories filter `deleted_at IS NULL` by default. Pass `includeDeleted: true` to include soft-deleted records.

### Rate Limiting

API endpoints are protected with configurable rate limits using `@nestjs/throttler`. The `ThrottlerGuard` is registered as a global `APP_GUARD` in `app.module.ts`, covering all routes including Better Auth `/api/auth/*` endpoints.

**Throttle Decorators:**
- `@StandardThrottle()` - 100 requests/min (most endpoints)
- `@BulkThrottle()` - 20 requests/min (bulk operations)
- `@AuthThrottle()` - 10 requests/min (auth endpoints to prevent brute force)
- `@SkipThrottle()` - Skip rate limiting (health checks)

Use at controller or method level. Method-level overrides class-level.

### Transaction Management

Critical operations use `@Transactional()` decorator to ensure atomicity:

Add `@Transactional()` to any service method that needs atomicity. The `TransactionInterceptor` wraps it in a TypeORM transaction with automatic rollback on error. Used on: `ProductsService.bulkCreate`, `InventoryService.create/adjustQuantity`, `CategoriesService.update`, `AreasService.update`.

### Foreign Keys

| Relationship          | On Delete | Effect                                |
| --------------------- | --------- | ------------------------------------- |
| Product → Category    | RESTRICT  | Cannot delete category with products  |
| Product → Supplier    | SET NULL  | Clears reference                      |
| Category → Category   | SET NULL  | Children become root                  |
| Area → Location       | CASCADE   | Deleting location deletes its areas   |
| Area → Area           | CASCADE   | Deleting parent deletes children      |
| Inventory → Product   | (default) | Reference required                    |
| Inventory → Location  | (default) | Reference required                    |
| Inventory → Area      | SET NULL  | Clears area reference                 |

## Adding a New Entity

1. **Entity** in `routes/<feature>/entities/<feature>.entity.ts` — extend `BaseEntity` or `BaseAuditEntity`
2. **DTOs** in `routes/<feature>/dto/` — Create, Update, Response, Query (if paginated)
3. **Repository** in `routes/<feature>/<feature>.repository.ts`
4. **Service** in `routes/<feature>/<feature>.service.ts`
5. **HATEOAS** in `routes/<feature>/<feature>.hateoas.ts`
6. **Controller** in `routes/<feature>/<feature>.controller.ts`
7. **Module** in `routes/<feature>/<feature>.module.ts`
8. **Register** in `app.module.ts` (imports) and `app.routes.ts`
9. **Update shared DTOs/enums** in `packages/types/src/<feature>/`

## Adding an Endpoint

1. Add HATEOAS links to `<module>.hateoas.ts` if needed
2. Add method to controller with:
   - `@UseInterceptors(HateoasInterceptor)`
   - `@<Module>Hateoas()` decorator
   - `@ApiOperation()`, `@ApiResponse()` for Swagger
3. Add service method with business logic
4. Add repository method if new query needed
5. Update shared DTOs/enums in `packages/types` if response/request shapes change

## API Routes

### Health & Auth

| Method | Path                      | Description                                       |
| ------ | ------------------------- | ------------------------------------------------- |
| GET    | `/health-check`           | Full health (DB + Better Auth, no auth, skip throttle)  |
| GET    | `/health-check/live`      | Liveness probe (always 200, k8s ready)            |
| GET    | `/health-check/ready`     | Readiness probe (DB check only, k8s ready)        |
| GET    | `/api/v1/auth/profile`    | Better Auth user profile                          |

### Categories

| Method | Path                     | Description              |
| ------ | ------------------------ | ------------------------ |
| GET    | `/api/v1/categories`     | List (hierarchical tree) |
| POST   | `/api/v1/categories`     | Create                   |
| PUT    | `/api/v1/categories/:id` | Update                   |
| DELETE | `/api/v1/categories/:id` | Delete                   |

### Products

| Method | Path                            | Description        |
| ------ | ------------------------------- | ------------------ |
| GET    | `/api/v1/products`              | List (paginated)   |
| GET    | `/api/v1/products/all`          | List all           |
| GET    | `/api/v1/products/:id`          | Get one            |
| POST   | `/api/v1/products`              | Create             |
| POST   | `/api/v1/products/bulk`         | Bulk create        |
| PUT    | `/api/v1/products/:id`          | Update             |
| PATCH  | `/api/v1/products/bulk/status`  | Bulk update status |
| DELETE | `/api/v1/products/:id`          | Delete (soft)      |
| DELETE | `/api/v1/products/bulk`         | Bulk delete        |
| PATCH  | `/api/v1/products/:id/restore`  | Restore            |
| PATCH  | `/api/v1/products/bulk/restore` | Bulk restore       |

### Locations

| Method | Path                     | Description      |
| ------ | ------------------------ | ---------------- |
| GET    | `/api/v1/locations`      | List (paginated) |
| GET    | `/api/v1/locations/:id`  | Get one          |
| POST   | `/api/v1/locations`      | Create           |
| PUT    | `/api/v1/locations/:id`  | Update           |
| DELETE | `/api/v1/locations/:id`  | Delete           |

### Areas

| Method | Path                        | Description         |
| ------ | --------------------------- | ------------------- |
| GET    | `/api/v1/areas`             | List with filters   |
| GET    | `/api/v1/areas/:id`         | Get one             |
| GET    | `/api/v1/areas/:id/children`| Get with children   |
| POST   | `/api/v1/areas`             | Create              |
| PUT    | `/api/v1/areas/:id`         | Update              |
| DELETE | `/api/v1/areas/:id`         | Delete (cascades)   |

### Inventory

| Method | Path                         | Description         |
| ------ | ---------------------------- | ------------------- |
| GET    | `/api/v1/inventory`          | List (paginated)    |
| GET    | `/api/v1/inventory/:id`      | Get one             |
| POST   | `/api/v1/inventory`          | Create              |
| PUT    | `/api/v1/inventory/:id`      | Update              |
| PATCH  | `/api/v1/inventory/:id/adjust` | Adjust quantity   |
| DELETE | `/api/v1/inventory/:id`      | Delete              |

### Audit Logs

| Method | Path                                              | Description                | Auth         |
| ------ | ------------------------------------------------- | -------------------------- | ------------ |
| GET    | `/api/v1/audit-logs`                              | List (paginated, filtered) | Admin only   |
| GET    | `/api/v1/audit-logs/:id`                          | Get one                    | Admin only   |
| GET    | `/api/v1/audit-logs/entity/:entityType/:entityId` | Entity audit history       | Admin only   |
| GET    | `/api/v1/audit-logs/user/:userId`                 | User audit history         | Admin only   |

**Note:** All audit-log endpoints are restricted to `@Roles(UserRole.ADMIN)`. Non-admin users receive 403.

### Users (Admin Only)

| Method | Path                                | Description          |
| ------ | ----------------------------------- | -------------------- |
| GET    | `/api/v1/users`                     | List (paginated, searchable) |
| GET    | `/api/v1/users/:id`                 | Get user with roles  |
| PUT    | `/api/v1/users/:id/roles`           | Set user roles       |
| PATCH  | `/api/v1/users/:id/ban`             | Ban user             |
| PATCH  | `/api/v1/users/:id/unban`           | Unban user           |
| DELETE | `/api/v1/users/:id`                 | Delete user          |
| POST   | `/api/v1/users/:id/revoke-sessions` | Revoke all sessions  |

**Note:** The users module does not use a repository pattern — it calls Better Auth's admin API directly (`auth.api.*`) and uses TypeORM only for the `user_roles` table. All endpoints require `@Roles(UserRole.ADMIN)`.

## Testing

### Unit Tests (Jest 30)

Config is inline in `package.json`. Test files: `src/**/*.spec.ts`

```bash
pnpm test                                        # All unit tests
pnpm test --testPathPatterns='audit'              # Filter by path
pnpm test:cov                                    # With coverage
```

**Important:** Jest 30 uses `--testPathPatterns` (plural), not `--testPathPattern`.

**Patterns:**
- Use `@nestjs/testing` `Test.createTestingModule()` for DI
- Mock repositories/services with `jest.fn()` + `mockResolvedValue()`
- Test util: `src/test-utils/execution-context.ts` for mocking `ExecutionContext`
- **Override RolesGuard in controller tests:** Controllers with `@UseGuards(RolesGuard)` require `.overrideGuard(RolesGuard).useValue({ canActivate: () => true })` on the test module builder, since `RolesGuard` depends on `DataSource` and `Reflector`
- **Async fire-and-forget testing:** Use `await flushPromises()` (via `new Promise(r => process.nextTick(r))`) instead of `setTimeout` with `done()` callbacks
- **Coverage thresholds** are configured at 50% globally; entities, DTOs, modules, and HATEOAS files are excluded from coverage

### E2E Tests (Jest + Supertest)

Config: `test/jest-e2e.json`. Test files: `test/*.e2e-spec.ts`

```bash
pnpm test:e2e                                    # Requires running DB
```

**Patterns:**
- Boot full NestJS app with `Test.createTestingModule({ imports: [AppModule] })`
- Override `AuthGuard` with mock: `.overrideGuard(AuthGuard).useValue(mockAuthGuard)`
- Clean DB in `beforeEach` with raw SQL deletes
- Use `supertest` for HTTP assertions

## Environment Variables

```bash
BETTER_AUTH_SECRET=sk_test_xxxxx    # Required

# Database (URL or individual vars)
DATABASE_URL=postgresql://user:pass@host:5432/librestock_inventory
# OR
PGHOST=localhost  PGPORT=5432  PGUSER=postgres  PGPASSWORD=pass  PGDATABASE=librestock_inventory

PORT=8080                          # Default: 8080
NODE_ENV=development               # development | production
```

## Shared Utilities

| Utility | Location | Purpose |
| ------- | -------- | ------- |
| `toPaginationMeta(total, page, limit)` | `common/utils/pagination.utils.ts` | Builds `{ page, limit, total, total_pages, has_next, has_previous }` metadata |
| `getDbConnectionParams()` | `config/db-connection.utils.ts` | Shared DB connection config used by both TypeORM and Better Auth |
| `createExecutionContext()` | `test-utils/execution-context.ts` | Mock `ExecutionContext` for interceptor/guard tests |

## Security Conventions

- **Never interpolate values into SQL** — always use parameterized queries (`:paramName` with `.setParameter()`)
- **Validate all user-submitted URLs** with `@IsUrl()` in DTOs — reject `javascript:` and `data:` protocols
- **Use `request.ip`** for IP extraction in audit logs (respects Express trust proxy settings)
- **Secrets** must be 32+ random bytes. Never place `BETTER_AUTH_SECRET` in the frontend `.env`.

## Response Formats

**Single entity:** `{ id, name, ..., _links: { self, update, delete } }`

**Paginated:** `{ data: [...], meta: { page, limit, total, total_pages, has_next, has_previous } }`

**Bulk operation:** `{ success_count, failure_count, succeeded: [...ids], failures: [{ id?, sku?, error }] }`

**Error:** `{ statusCode, message, error }`

