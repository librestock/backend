import { Context, Layer } from 'effect';
import { auth } from '../../auth';

export interface BetterAuthService {
  readonly auth: typeof auth;
  readonly handler: typeof auth.handler;
  readonly api: typeof auth.api;
}

export const BetterAuth = Context.GenericTag<BetterAuthService>(
  '@librestock/effect/BetterAuth',
);

export const BetterAuthHeaders = Context.GenericTag<globalThis.Headers>(
  '@librestock/effect/BetterAuthHeaders',
);

export const betterAuthLayer = Layer.succeed(BetterAuth, {
  auth,
  handler: auth.handler,
  api: auth.api,
});
