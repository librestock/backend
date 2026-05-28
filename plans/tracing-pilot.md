# Plan: Tracing Pilot

> Source PRD: `~/Documents/obsidian vault/100-PROJECTS/STOCKET/audits/Tracing Pilot Implementation Plan 2026-04-14.md`

## Goal

Evolve `makeServiceTracer` into a module-aware helper that auto-injects standard dashboard-safe attributes and failure metadata, and prove the shape on three pilot modules (`auth`, `users`, `orders`) before a repo-wide rollout.

## Architectural decisions

Durable decisions that apply across all phases:

- **Helper location**: `src/effect/platform/service-tracer.ts` remains the single factory. All pilot services construct spans through it — no raw `Effect.withSpan(...)` in pilot module services.
- **Helper signature**: `makeServiceTracer({ serviceName, module, layer })` replaces the string-only form. `serviceName` preserves the existing span-name prefix; `module` and `layer` are auto-injected as attributes on every span produced by the instance.
- **Dashboard-safe attributes** (low cardinality, added by the helper): `module`, `operation`, `layer`, `entityType`, `outcome`, `errorType`.
- **Correlation attributes** (high cardinality, set per method or by helper): `requestId`, `userId`, `orderId`, `productId`, `locationId`, `clientId`, `entityId`. `id` is retained as transitional — prefer the semantic field when the meaning is clear.
- **Outcome taxonomy**:
  - success path → `outcome: 'success'`
  - `NotFoundError` / `*NotFound` tagged errors → `outcome: 'not_found'`
  - `BadRequestError` → `outcome: 'validation_error'`
  - any other failure → `outcome: 'failure'`
  - `errorType` is always the tagged error name on failure spans.
- **Request attribution**: `requestId` is attached automatically by the helper when request context is in scope — individual methods do not pass it.
- **Entity typing in pilot**:
  - `auth` spans default to `entityType: 'user'` unless the method is clearly session-only.
  - `users` spans use `entityType: 'user'`.
  - `orders` spans use `entityType: 'order'`.
- **Non-goals (explicitly out of scope for the pilot)**: repository-layer spans, HTTP boundary span helpers, `statusCode` attribute, span-level duplication of `service`/`environment`, and any migration outside `auth`/`users`/`orders`.

---

## Phase 1: Module-aware helper + `auth` migration

**User stories covered**: PRD Phases 1, 2, and 4 — schema expansion, module-aware factory, first consumer migration.

### What to build

Expand the trace attribute catalog to include the new dashboard-safe fields and `requestId`. Evolve `makeServiceTracer` to accept `{ serviceName, module, layer }` and auto-inject `module`, `operation` (from method name), and `layer` on every span it creates. Migrate `auth` — already the simplest consumer of the existing helper — to the new shape so we have one end-to-end consumer proving the design. Add focused helper-level tests for default attribute injection and method-level attribute merging.

### Acceptance criteria

- [ ] Trace attribute catalog includes `module`, `operation`, `layer`, `entityType`, `outcome`, `errorType`, `requestId` with explicit cardinality/type definitions.
- [ ] `makeServiceTracer` accepts the object form `{ serviceName, module, layer }`; span-name prefix behavior is preserved.
- [ ] Every span produced by the helper carries `module`, `operation`, and `layer` without the method specifying them.
- [ ] Method-level attributes merge over helper defaults (method wins on collision).
- [ ] `auth` service uses the new helper API — no method constructs its own `module`/`operation`/`layer` attributes.
- [ ] Auth spans carry `entityType: 'user'` by default, omitted only on clearly session-only methods.
- [ ] Helper-level tests cover: default attributes injected, method-level merge, `operation` derived from method name.
- [ ] Existing `auth` behavior tests still pass; add a small focused test if auth lacks coverage of the new attribute shape.

---

## Phase 2: Auto request + failure attribution + `users` migration

**User stories covered**: PRD Phases 3 and 5 — request context, outcome/errorType mapping, migration of a partly-instrumented service.

### What to build

Teach the helper to attach `requestId` automatically when request context is in scope, and to set `outcome` + `errorType` from the effect's success/failure channel using the taxonomy above (including the pilot decision that `BadRequestError` → `validation_error`). Migrate `users` to the new helper, swapping generic `id` for `userId` where the meaning is clearly a user identifier and adding `entityType: 'user'`. Cover the new helper behavior with focused tests and re-run the users service spec.

### Acceptance criteria

- [ ] Helper attaches `requestId` when request context exists and is a no-op when it doesn't — no individual method passes `requestId`.
- [ ] Success spans carry `outcome: 'success'`.
- [ ] `NotFoundError` / `*NotFound` tagged failures map to `outcome: 'not_found'`.
- [ ] `BadRequestError` failures map to `outcome: 'validation_error'`.
- [ ] All other failures map to `outcome: 'failure'`.
- [ ] Failure spans capture `errorType` from the tagged error name.
- [ ] Outcome/errorType logic lives in the helper, not in service methods.
- [ ] `users` service uses the new helper; `userId` is preferred over `id` where the meaning is a user identifier; `entityType: 'user'` is present where appropriate.
- [ ] Helper tests cover: `requestId` attached when in scope, each outcome mapping, `errorType` captured from tagged errors.
- [ ] `src/effect/modules/users/service.spec.ts` passes without modification beyond attribute assertion updates.

---

## Phase 3: `orders` migration from raw `withSpan`

**User stories covered**: PRD Phase 6 — prove the migration path from raw spans to helper-managed spans.

### What to build

Replace direct `Effect.withSpan(...)` usage in `orders/service.ts` with the new helper, setting module defaults once in the tracer instance. Prefer `orderId` over generic `id` on `findOne`, `update`, `updateStatus`, `delete`, and `existsById`; keep `clientId` on `create`; apply `entityType: 'order'`. Re-run the orders service and integration specs. Review the resulting span shape in practice before deciding on next modules — this is the gate that decides whether the pilot expands.

### Acceptance criteria

- [ ] No raw `Effect.withSpan(...)` remains in `src/effect/modules/orders/service.ts`.
- [ ] Orders spans carry `module`, `operation`, `layer`, and `entityType: 'order'` via helper defaults.
- [ ] `findOne`, `update`, `updateStatus`, `delete`, `existsById` use `orderId` instead of generic `id`.
- [ ] `create` retains `clientId`.
- [ ] Failure spans in orders carry correct `outcome` + `errorType` without per-method plumbing.
- [ ] `src/effect/modules/orders/service.spec.ts` and `service.integration.spec.ts` pass.
- [ ] Span shape reviewed before proposing wave-2 modules (`inventory`, `products`, `clients`, `locations`).

---

## Pilot completion gate

The pilot is done when all of the following hold across `auth`, `users`, and `orders`:

- [ ] No raw `Effect.withSpan(...)` in pilot service methods.
- [ ] Pilot spans include `module`, `operation`, and `layer`.
- [ ] Request-scoped spans include `requestId` where available.
- [ ] Failure spans include `outcome` and `errorType`.
- [ ] `BadRequestError` → `validation_error`; `NotFoundError` → `not_found`.
- [ ] Semantic IDs preferred over generic `id` where straightforward.
