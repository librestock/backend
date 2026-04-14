# LibreStock API Module

## Tooling

- Dependencies are managed by **pnpm** via the root workspace (`pnpm install` from repo root). Do not use `bun install`.
- **Bun** is the runtime — `bun run src/effect/main.ts` starts the server.
- All `@librestock/*` packages use `workspace:*` — changes to `packages/types` are available immediately after building (`pnpm --filter @librestock/types build`).

## Architecture

- The app entrypoint is [`src/effect/main.ts`](src/effect/main.ts). It wires `Effect` layers explicitly rather than using Nest modules.
- Feature code lives under `src/effect/modules/<feature>/`.
- The common pattern is:
  - `router.ts`: HTTP boundary
  - `service.ts`: application service
  - `repository.ts`: DB access
  - `*.schema.ts`: query/body decoding
  - `*.errors.ts`: tagged errors
- Cross-module access should normally go through Services, not repositories.
- Platform concerns live under `src/effect/platform/`:
  - Drizzle connection/layer
  - Better Auth integration
  - request/session/auth helpers
  - audit logging

## Conventions

- Routers usually follow the sequence: `requirePermission` -> decode request -> call service -> `respondJson` -> optionally `AuditLogWriter`.
- `UsersService` is the main exception to the repository pattern: it talks to Better Auth admin APIs directly and uses local persistence for role assignment concerns.
- `AuditLogWriter` is fire-and-forget. Do not build correctness around audit writes succeeding synchronously.
- Shared request/response contracts should come from `@librestock/types`, not backend-local DTO files.

## Effect idioms

Preferred operators — don't reintroduce the long forms during refactors:

- **`Effect.merge(e)`** over `Effect.catchAll(e, (err) => Effect.succeed(err))` — folds error channel into success.
- **`Effect.filterOrFail(predicate, () => err)`** over `yield* check; if (!check) yield* Effect.fail(err)` or `Effect.flatMap(check, (v) => v ? Effect.void : Effect.fail(err))`. Use `Boolean` as the predicate for raw boolean checks.
- **`Effect.mapError((e) => new XError(e))`** over `Effect.catchAll((e) => Effect.fail(new XError(e)))`.
- **`Effect.tapError(cleanup)` + `Effect.ignore(...)`** over inline `catchAll` that runs side-effecting cleanup and then refails with the original error.
- **`Effect.void`** over `Effect.succeed(undefined)`.
- **`makeTryAsync`** (from `src/effect/platform/try-async.ts`) for promise-wrapping paths that map every failure to the module's infrastructure error. Raw `Effect.tryPromise` is still correct when each call uses a **distinct hand-typed `MessageKey`** (see Structured Logging below) — collapsing those onto a dynamic-key helper would break Datadog indexing.

### Services

- `DrizzleDatabase` and `BetterAuth` are **not** declared as `dependencies:` on services. They are provided once via `platformLayer` in `main.ts`. Putting them on individual service defaults would create duplicate connection pools. (The constraint is also noted inline in `src/effect/modules/health/service.ts`.)

### Tracing — off-limits

`src/effect/platform/service-tracer.ts` (`makeServiceTracer`) is the project's chosen tracing abstraction. It overlaps superficially with `Effect.fn("span")(...)` but captures outcome classification (not_found vs validation_error vs failure) and request-context attributes that `Effect.fn` alone doesn't. **Do not migrate service methods to `Effect.fn` or replace this module without explicit direction** — it was recently rebuilt (`d6b68967`, `3872a732`).

## Structured Logging

- All log message arguments must use properties defined in `LogProperties` (`src/effect/platform/messages.ts`). Do **not** pass arbitrary key-value pairs — every field must be known so it can be indexed by Datadog / OpenSearch.
- `MessageArgs` is `Partial<LogProperties>`. When a new message template introduces a `{placeholder}`, add the corresponding property to `LogProperties` with its exact type (`string` or `number`).
- Message catalogs live in `src/effect/platform/catalogs/` — one file per locale (`en.ts`, `fr.ts`, `de.ts`). The English catalog (`en.ts`) is the source of truth for `MessageKey`.
- Use `createLogger(scope)` for structured logging. The logger prepends the scope to each message key automatically.

## Gotchas

- `README.md` and older notes may still mention NestJS/TypeORM-era concepts. Prefer the `src/effect/` code over stale docs.
- Better Auth migrations are run from [`src/effect/main.ts`](src/effect/main.ts) outside production unless explicitly disabled/enabled by env.
- This repo still has some legacy TypeORM migration scripts/config, but the runtime data layer is Drizzle.
- `pnpm-lock.yaml` at the workspace root is the lockfile.

## Shared Types Workflow

When request/response shapes change:

1. Update `packages/types`
2. Run `pnpm --filter @librestock/types barrels && pnpm --filter @librestock/types build`
3. Changes are available immediately to backend (workspace link)

## Testing

- Unit tests are Vitest-based and mostly service-level today. Run with `pnpm test`.
- For cross-module workflows, prefer a deeper boundary over adding more mocks around neighboring services.
- If type-check fails, confirm whether the failure is from your change or from existing repo-wide issues before chasing unrelated errors.

## Issue Tracking

Before starting work on any issue, ensure it is added to the **[LibreStock Improvements Tracker](https://github.com/orgs/librestock/projects/2)** GitHub Project. Move the issue to "In Progress" when starting and "Done" when complete.
