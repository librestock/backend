import { Effect } from 'effect';
import { requireSession } from '../../platform/session';
import { makeServiceTracer } from '../../platform/service-tracer';
import { RolesService } from '../roles/service';
import {
  toCurrentUserResponse,
  toProfileResponse,
  toSessionClaimsResponse,
} from './mappers';

export class AuthService extends Effect.Service<AuthService>()(
  '@librestock/effect/AuthService',
  {
    effect: Effect.gen(function* () {
      const rolesService = yield* RolesService;
      const trace = makeServiceTracer({
        serviceName: 'AuthService',
        module: 'auth',
        layer: 'service',
        entityType: 'user',
      });

      const me = trace.traced('me', () =>
        Effect.gen(function* () {
          const session = yield* requireSession;
          yield* Effect.annotateCurrentSpan({ userId: session.user.id });
          const userPermissions = yield* rolesService.getPermissionsForUser(
            session.user.id,
          );
          return toCurrentUserResponse(session, userPermissions);
        }));

      const profile = trace.traced('profile', () =>
        Effect.gen(function* () {
          const session = yield* requireSession;
          yield* Effect.annotateCurrentSpan({ userId: session.user.id });
          return toProfileResponse(session);
        }));

      const sessionClaims = trace.traced('sessionClaims', () =>
        Effect.gen(function* () {
          const session = yield* requireSession;
          yield* Effect.annotateCurrentSpan({ userId: session.user.id });
          return toSessionClaimsResponse(session);
        }));

      return {
        me,
        profile,
        sessionClaims,
      };
    }),
    dependencies: [RolesService.Default],
  },
) {}
