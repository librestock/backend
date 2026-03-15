import { Effect } from 'effect';
import { UsersInfrastructureError } from './users.errors';

export const userTryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new UsersInfrastructureError({
        action,
        cause,
        message: `Users service failed to ${action}`,
      }),
  });
