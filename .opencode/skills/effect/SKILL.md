---
name: effect
description: Verify Effect API and pattern questions against source and local project guardrails
---

# Effect

Use this skill for questions or changes involving Effect APIs, layers, services, typed errors, tracing, request handling, or tests.

## Workflow

1. Prefer local project examples first, especially under `src/effect/modules` and `src/effect/platform`.
2. For framework API uncertainty, verify against the Effect source before answering from memory.
3. If `effect-code/effect` exists, treat it as a read-only Effect reference checkout.
4. If no local Effect checkout exists and source verification matters, clone `https://github.com/Effect-TS/effect` into `.opencode/references/effect`.
5. Keep final guidance aligned with root `AGENTS.md` and any closer scoped AGENTS.md files.

## LibreStock Guardrails

- Keep feature work under `src/effect/modules/<feature>/`.
- Cross-module calls should normally go through services.
- Use `makeTryAsync` when a promise wrapper maps every failure to one infrastructure error.
- Keep raw `Effect.tryPromise` when each call needs a distinct hand-typed `MessageKey`.
- Do not add `DrizzleDatabase` or `BetterAuth` as service `dependencies:`.
- Do not replace `src/effect/platform/service-tracer.ts` or migrate service methods to `Effect.fn` without explicit direction.

## Answering

- Cite concrete local files or Effect source files when the answer depends on implementation detail.
- Prefer the smallest idiomatic Effect change over introducing helpers.
- If type-check failures are unrelated to the change, state that before chasing them.
