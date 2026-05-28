import { Effect } from 'effect';

/**
 * Creates a module-scoped `tryAsync` wrapper that maps promise failures to
 * the module's infrastructure error type.
 *
 * Usage:
 * ```ts
 * const tryAsync = makeTryAsync((action, cause) =>
 *   new ProductsInfrastructureError({ action, cause, messageKey: 'products.repositoryFailed' }),
 * );
 * ```
 */
export const makeTryAsync =
  <E>(toError: (action: string, cause: unknown) => E) =>
  <A>(action: string, run: () => Promise<A>): Effect.Effect<A, E> =>
    Effect.tryPromise({ try: run, catch: (cause) => toError(action, cause) });
