import { Effect } from 'effect';
import { CategoriesInfrastructureError } from './categories.errors';

export const categoryTryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new CategoriesInfrastructureError({
        action,
        cause,
        message: `Categories service failed to ${action}`,
      }),
  });
