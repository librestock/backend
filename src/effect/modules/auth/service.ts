import { Effect } from 'effect';
import { requireSession } from '../../platform/session';
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

      const me = () =>
        Effect.gen(function* () {
          const session = yield* requireSession;
          const userPermissions = yield* rolesService.getPermissionsForUser(
            session.user.id,
          );
          return toCurrentUserResponse(session, userPermissions);
        }).pipe(Effect.withSpan('AuthService.me'));

      const profile = () =>
        Effect.gen(function* () {
          const session = yield* requireSession;
          return toProfileResponse(session);
        }).pipe(Effect.withSpan('AuthService.profile'));

      const sessionClaims = () =>
        Effect.gen(function* () {
          const session = yield* requireSession;
          return toSessionClaimsResponse(session);
        }).pipe(Effect.withSpan('AuthService.sessionClaims'));

      return {
        me,
        profile,
        sessionClaims,
      };
    }),
    dependencies: [RolesService.Default],
  },
) {}
