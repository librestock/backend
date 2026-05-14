# LibreStock API Module

## Tooling

- Use **pnpm** from the workspace root for dependencies and script execution.
- **pnpm** runs the API: `pnpm start`.
- `pnpm-lock.yaml` at the workspace root is the lockfile.

## Boundaries

- Keep feature work under `src/effect/modules/<feature>/` and follow the existing router/service/repository/schema/error split.
- Cross-module access should normally go through services, not another module's repository.
- Shared request/response contracts should come from `@librestock/types`, not backend-local DTO files.
- `UsersService` talks to Better Auth admin APIs directly and uses local persistence for role assignment concerns.
- `AuditLogWriter` is fire-and-forget; do not build correctness around audit writes succeeding synchronously.

## Effect Guardrails

- Prefer `Effect.merge(e)` over `Effect.catchAll(e, (err) => Effect.succeed(err))`.
- Prefer `Effect.filterOrFail(predicate, () => err)` for boolean checks; use `Boolean` for raw boolean values.
- Prefer `Effect.mapError((e) => new XError(e))` over catch-and-refail wrappers.
- Prefer `Effect.tapError(cleanup)` plus `Effect.ignore(...)` for side-effecting cleanup that must refail with the original error.
- Prefer `Effect.void` over `Effect.succeed(undefined)`.
- Use `makeTryAsync` for promise wrappers that map every failure to the module's infrastructure error. Keep raw `Effect.tryPromise` when each call uses a distinct hand-typed `MessageKey`.
- Do not declare `DrizzleDatabase` or `BetterAuth` as service `dependencies:`; they are provided once through `platformLayer`.
- Do not replace `src/effect/platform/service-tracer.ts` or migrate service methods to `Effect.fn` without explicit direction.

## Structured Logging

- Log message arguments must use properties defined in `LogProperties` (`src/effect/platform/messages.ts`).
- When adding a message placeholder, add the matching `LogProperties` field and update every locale catalog.
- Use `createLogger(scope)` so message keys are scoped consistently.

## Shared Types

When request/response shapes change:

1. Update `packages/types`.
2. Run `pnpm --filter @librestock/types barrels && pnpm --filter @librestock/types build`.
3. Use the workspace-linked types directly from the backend.

## Testing

- Run unit tests with `pnpm test`.
- For cross-module workflows, prefer a deeper boundary over more mocks around neighboring services.
- If type-check fails, confirm whether the failure is from your change before chasing unrelated errors.

## Issue Tracking

Before starting work on any issue, ensure it is added to the **[LibreStock Improvements Tracker](https://github.com/orgs/librestock/projects/2)** GitHub Project. Move the issue to "In Progress" when starting and "Done" when complete.
