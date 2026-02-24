# LibreStock API Module

## Conventions (not enforced by code)

- **Module export rule:** Modules only export their Service, never the Repository. Cross-module access goes through the Service layer.
- **HATEOAS definitions** use relative paths (e.g. `/products/${id}`). The `HateoasInterceptor` auto-prepends `{protocol}://{host}/api/v1`.
- **RolesGuard** queries the `user_roles` table in the DB, not session claims. Falls back to session roles only if the DB returns nothing.
- **Users module** skips the repository pattern — it calls Better Auth's admin API directly (`auth.api.*`) and only uses TypeORM for the `user_roles` table.

## Gotchas

- **Jest 30** uses `--testPathPatterns` (plural), not `--testPathPattern`
- **`DB_SYNCHRONIZE`** is `false` by default. New tables must be created manually or by setting it to `true`. Blocked in production regardless.

## Security (policy decisions)

- Never interpolate values into SQL — use parameterized queries (`:paramName` with `.setParameter()`)
- Validate user-submitted URLs with `@IsUrl()` — reject `javascript:` and `data:` protocols
- Use `request.ip` for audit log IP extraction (respects trust proxy)
- `BETTER_AUTH_SECRET` must be 32+ random bytes and must never appear in the frontend `.env`

## Testing patterns (non-obvious)

- **Controller tests with RolesGuard:** Must `.overrideGuard(RolesGuard).useValue({ canActivate: () => true })` because `RolesGuard` depends on `DataSource`
- **Async fire-and-forget:** Use `await flushPromises()` (via `new Promise(r => process.nextTick(r))`) instead of `setTimeout` with `done()` callbacks
- **E2E:** Override `AuthGuard` with mock, clean DB in `beforeEach` with raw SQL deletes

## Adding a new entity

Follow existing module patterns, but don't forget these easy-to-miss steps:

1. Register module in `app.module.ts` imports **and** `app.routes.ts`
2. Update shared DTOs/enums in `packages/types/src/<feature>/`
3. Run `pnpm --filter @librestock/types barrels && pnpm --filter @librestock/types build`

## Adding an endpoint

After adding the controller method + service logic, don't forget:

1. Update shared DTOs/enums in `packages/types` if response/request shapes change
2. Rebuild types (barrels → build)
