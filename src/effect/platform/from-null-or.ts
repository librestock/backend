import { Effect } from 'effect';

/**
 * Converts an effect that returns `A | null` into one that returns `A`
 * or fails with the error produced by `onNull`.
 *
 * Replaces the repeated `getXOrFail` pattern across services:
 * ```ts
 * const getProductOrFail = (id: string) =>
 *   fromNullOr(repository.findById(id), () => new ProductNotFound({ ... }));
 * ```
 */
export const fromNullOr = <A, E, E2, R>(
  effect: Effect.Effect<A | null, E, R>,
  onNull: () => E2,
): Effect.Effect<NonNullable<A>, E | E2, R> =>
  Effect.flatMap(effect, (value) =>
    value !== null
      ? Effect.succeed(value as NonNullable<A>)
      : Effect.fail(onNull()),
  );
