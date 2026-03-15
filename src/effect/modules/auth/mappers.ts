import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { CurrentUserResponseDto } from '../../../routes/auth/dto/current-user-response.dto';
import type { ProfileResponseDto } from '../../../routes/auth/dto/profile-response.dto';
import type { SessionClaimsResponseDto } from '../../../routes/auth/dto/session-claims-response.dto';
import {
  getSessionIdFromSession,
  getSessionTimingFromSession,
  getUserIdFromSession,
} from '../../../common/auth/session';
import type { UserPermissions } from '../roles/service';

export const toCurrentUserResponse = (
  session: UserSession,
  userPermissions: UserPermissions,
): CurrentUserResponseDto => {
  const { id, name, email, image } = session.user;

  return {
    id,
    name,
    email,
    image: image ?? undefined,
    roles: userPermissions.roleNames,
    permissions: userPermissions.permissions,
  };
};

export const toProfileResponse = (
  session: UserSession,
): ProfileResponseDto => {
  const { id, name, email, image, createdAt, updatedAt } = session.user;

  return {
    id,
    name,
    email,
    image: image ?? undefined,
    createdAt:
      createdAt instanceof Date ? createdAt.toISOString() : String(createdAt),
    updatedAt:
      updatedAt instanceof Date ? updatedAt.toISOString() : String(updatedAt),
  };
};

export const toSessionClaimsResponse = (
  session: UserSession,
): SessionClaimsResponseDto => {
  const { issuedAt, expiresAt } = getSessionTimingFromSession(session);

  return {
    user_id: getUserIdFromSession(session) ?? '',
    session_id: getSessionIdFromSession(session) ?? '',
    expires_at: expiresAt ?? 0,
    issued_at: issuedAt ?? 0,
  };
};
