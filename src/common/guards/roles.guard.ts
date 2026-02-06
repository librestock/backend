import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums';
import { getUserSession } from '../auth/session';

type RoleClaim = string | string[] | undefined;

const normalizeRoles = (claim: RoleClaim): string[] => {
  if (Array.isArray(claim)) {
    return claim;
  }
  return claim ? [claim] : [];
};

const extractSessionRoles = (session: UserSession | undefined) => {
  if (!session) {
    return [];
  }

  const claims = session as Record<string, any>;
  const candidateRoles = [
    claims.user?.roles,
    claims.user?.role,
    claims.roles,
    claims.role,
    claims.user?.metadata?.roles,
    claims.user?.metadata?.role,
    claims.user?.publicMetadata?.roles,
    claims.user?.publicMetadata?.role,
    claims.user?.public_metadata?.roles,
    claims.user?.public_metadata?.role,
  ];

  return candidateRoles.flatMap((roleClaim) => normalizeRoles(roleClaim));
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles =
      this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const session = getUserSession(request);
    const userId = session?.user?.id;

    // Try DB-backed roles first
    let roles: string[] = [];
    if (userId) {
      try {
        const rows: { role: string }[] = await this.dataSource.query(
          'SELECT role FROM user_roles WHERE user_id = $1',
          [userId],
        );
        roles = rows.map((r) => r.role);
      } catch {
        // Table may not exist yet during migrations; fall back to session roles
      }
    }

    // Fall back to session-based roles if DB returned nothing
    if (roles.length === 0) {
      roles = extractSessionRoles(session);
    }

    const hasRole = requiredRoles.some((role) => roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    return true;
  }
}
