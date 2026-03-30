import { type Context, Effect, Layer } from 'effect';

/**
 * Creates a test layer for an Effect service tag.
 *
 * Unimplemented methods die loudly with Effect.die() rather than returning
 * undefined silently, so accidental calls to out-of-scope methods fail fast.
 *
 * Usage:
 *   const repoLayer = makeTestLayer(ProductsRepository)({
 *     findById: (id) => Effect.succeed(makeProductEntity({ id })),
 *     findBySku: () => Effect.succeed(null),
 *   });
 *   // Provide via Effect.provide(repoLayer) inside it.effect(...)
 */
const makeUnimplementedProxy = <S extends object>(key: string, service: Partial<S>): S =>
  new Proxy(service as S, {
    get(target, prop) {
      if (prop in target) return (target as any)[prop];
      return () =>
        Effect.die(
          `${key}.${String(prop)} was called in a test but is not implemented in the test layer. Add it to makeTestLayer(${key})({...}).`,
        );
    },
  });

export const makeTestLayer =
  <I, S extends object>(tag: Context.Tag<I, S>) =>
  (service: Partial<S>): Layer.Layer<I> =>
    Layer.succeed(tag, makeUnimplementedProxy(tag.key, service));
