# LibreStock API Module

## Tooling

- `backend/` uses **Bun** as its package manager/runtime. Use `bun install` and `bun run ...` here.
- The shared `packages/` repo is separate and uses `pnpm`. Do not assume the same package manager across repos.
- This backend currently depends on published `@librestock/types` versions, so shared type changes must be released before this repo consumes them.

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

## Gotchas

- `README.md` and older notes may still mention NestJS/TypeORM-era concepts. Prefer the `src/effect/` code over stale docs.
- Better Auth migrations are run from [`src/effect/main.ts`](src/effect/main.ts) outside production unless explicitly disabled/enabled by env.
- This repo still has some legacy TypeORM migration scripts/config, but the runtime data layer is Drizzle.
- `bun.lock` is the lockfile that matters for this repo.

## Shared Types Workflow

When request/response shapes change:

1. update `packages/types`
2. publish the new `@librestock/types` version
3. bump the dependency here
4. then switch imports in `backend/`

If a new `@librestock/types` version is not published yet, pointing `backend/package.json` at it will break installs.

## Testing

- Unit tests are Jest-based and mostly service-level today.
- For cross-module workflows, prefer a deeper boundary over adding more mocks around neighboring services.
- If type-check fails, confirm whether the failure is from your change or from existing repo-wide issues before chasing unrelated errors.

## Issue Tracking

Before starting work on any issue, ensure it is added to the **[LibreStock Improvements Tracker](https://github.com/orgs/librestock/projects/2)** GitHub Project. Move the issue to "In Progress" when starting and "Done" when complete.
