import { Context, Effect } from 'effect';
import type { CurrentUserResponseDto } from '../../../routes/auth/dto/current-user-response.dto';
import type { ProfileResponseDto } from '../../../routes/auth/dto/profile-response.dto';
import type { SessionClaimsResponseDto } from '../../../routes/auth/dto/session-claims-response.dto';
import { requireSession } from '../../platform/session';
import { RolesService } from '../roles/service';
import {
  toCurrentUserResponse,
  toProfileResponse,
  toSessionClaimsResponse,
} from './mappers';

export interface AuthService {
  readonly me: () => Effect.Effect<CurrentUserResponseDto, unknown, any>;
  readonly profile: () => Effect.Effect<ProfileResponseDto, unknown, any>;
  readonly sessionClaims: () => Effect.Effect<SessionClaimsResponseDto, unknown, any>;
}

export const AuthService = Context.GenericTag<AuthService>(
  '@librestock/effect/AuthService',
);

export const makeAuthService = Effect.gen(function* () {
  const rolesService = yield* RolesService;

  return {
    me: () =>
      Effect.gen(function* () {
        const session = yield* requireSession;
        const userPermissions = yield* rolesService.getPermissionsForUser(
          session.user.id,
        );
        return toCurrentUserResponse(session, userPermissions);
      }),
    profile: () =>
      Effect.gen(function* () {
        const session = yield* requireSession;
        return toProfileResponse(session);
      }),
    sessionClaims: () =>
      Effect.gen(function* () {
        const session = yield* requireSession;
        return toSessionClaimsResponse(session);
      }),
  } satisfies AuthService;
});
