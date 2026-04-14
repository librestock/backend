# Effect Idioms — Extraction & Application Progress

Source of truth for the ralph-loop task: extract Effect-TS idioms from the vendored `effect/` source tree and apply them to `src/effect/`.

## Extracted idioms (from `effect/packages/`)

### Services
- `Effect.Service<Self>()("identifier", { effect | scoped | sync, dependencies?, accessors? })` is the app-code pattern.
- `dependencies: [OtherService.Default, ...]` auto-bundles transitive layers into `.Default`.
- `accessors: true` generates static method helpers on the class (e.g. `Logger.info(...)` vs `yield* Logger; logger.info(...)`).
- Identifiers follow reverse-domain: `@librestock/effect/<Module>/<Service>` (current code uses `@librestock/effect/<Service>` without module segment — consider adding hierarchy).
- Context.Tag / Context.GenericTag are for library-level code; `Effect.Service` is preferred for app services.

### Errors
- `Schema.TaggedError<Self>()("Tag", {...fields}, HttpApiSchema.annotations({ status: 404 }))` — schema-driven, with HTTP status baked in.
- `Data.TaggedError("Tag")<{...}>` — lighter; used when you don't need schema encoding.
- Refinements: `const isFoo = (e): e is Foo => e._tag === "Foo"` — effect uses a `TypeId` symbol for cross-module discrimination.

### Effects
- `Effect.fn("spanName")(function* (...args) { ... })` auto-wraps in a named span. Use for public service methods.
- `Effect.fnUntraced` is the untraced variant.
- `Effect.merge` == `Effect.catchAll(e => Effect.succeed(e))` — prefer `Effect.merge` (or `Effect.either`) over the anonymous arrow.
- `Effect.catchTag` / `Effect.catchTags` > `Effect.catchAll` when the error types are known; preserves type narrowing.
- `Effect.orDie` converts expected errors to defects; `Effect.orElseFail(() => err)` replaces the error.
- Prefer `Effect.gen` for multi-step logic with bindings, `pipe` for pure operator chains.

### Options / nullable
- `Option.fromNullable`, `Option.match({ onNone, onSome })`, `Option.getOrElse`.
- Our `fromNullOr` helper is acceptable sugar; keep.

### HTTP
- Canonical: `HttpApi` + `HttpApiGroup` + `HttpApiEndpoint` (schema-driven, OpenAPI-ready) over `HttpRouter`.
- `HttpApiSchema.annotations({ status })` attaches HTTP status to a Schema.
- Our code uses `HttpRouter` everywhere except Health (which uses `HttpApiBuilder`).

### Layers
- `Layer.effect`, `Layer.scoped`, `Layer.succeed`, `Layer.mergeAll`, `Layer.provide`, `Layer.provideMerge`, `Layer.effectDiscard`.
- Layer.launch for the program entry.

### Match
- `Match.type<T>().pipe(Match.tag("X", ...), Match.exhaustive)` for discriminated unions.
- `Match.value(x).pipe(Match.when(...), Match.orElse(...))` for runtime branching.

### Import style
- Effect source itself uses namespace imports (`import * as Effect from "effect/Effect"`) + `.js` extensions (pure ESM).
- App code idiomatically uses destructured imports (`import { Effect } from "effect"`) — current codebase is consistent and fine.

## Audit of `src/effect/`

### Already idiomatic ✓
- `Effect.Service` with `dependencies: [X.Default]` — adopted across nearly all services (areas, audit-logs, auth, categories, clients, fulfillment, inventory, locations, orders, photos, products, roles, stock-movements, suppliers, users).
- `fromNullOr` (`platform/from-null-or.ts`) — acceptable sugar.
- `Data.TaggedError`-based custom error factory (`platform/domain-errors.ts`) — carries `statusCode`, `messageKey`, i18n args. Diverges from `Schema.TaggedError` but is coherent.
- Layer composition in `main.ts` correctly uses `Layer.mergeAll` / `Layer.provide`.

### Punch list (ranked by value, avoiding tracing — recent user commits landed that work)

1. **Routers use `HttpRouter` not `HttpApi`** — Health is the only one migrated. Big but risky; multi-iteration effort.
2. **`HealthService` and `BrandingService` miss `dependencies:`** — they `yield*` `DrizzleDatabase` / `BetterAuth` directly. Can declare `drizzleLayer` / `betterAuthLayer` as deps to simplify `main.ts`.
3. **`Effect.catchAll(f => Effect.succeed(f))` in `health/service.ts`** → `Effect.merge`. ✅ DONE (commit 413fa583).
4. **Service identifiers lack module segment** — `@librestock/effect/ProductsService` → `@librestock/effect/products/ProductsService`. Cheap rename; no external consumers in-tree.
5. **`makeTryAsync`** — thin wrapper over `Effect.tryPromise`. Not wrong, not worth ripping out.
6. **No `Effect.catchTag` usage** — broad `catchAll` in photos/audit/http/app. Check whether errors are typed well enough to migrate.
7. **`Schema.TaggedError` vs custom factory** — architectural; defer until HttpApi migration forces the issue.
8. **`service-tracer.ts`** — overlaps with `Effect.fn`. **DO NOT TOUCH** — recent tracing commits, user just rebuilt this.

## Iteration log

- **Iteration 1**: extracted idioms; audited code; scoped punch list; landed `Effect.merge` refactor in `health/service.ts` (#3). Next target (#4): service identifier hierarchy rename, or (#2): declare platform layer deps on HealthService/BrandingService.
