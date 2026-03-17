import { Context, Layer } from 'effect';
import type { Auth } from 'better-auth';
import { auth } from '../../auth';

export interface BetterAuthService {
  readonly auth: Auth;
  readonly handler: (request: Request) => Promise<Response>;
  readonly api: typeof auth.api;
}

export const BetterAuth = Context.GenericTag<BetterAuthService>(
  '@librestock/effect/BetterAuth',
);

export const betterAuthLayer = Layer.succeed(BetterAuth, {
  auth,
  handler: auth.handler,
  api: auth.api,
});
