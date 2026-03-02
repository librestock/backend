import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSION_KEY,
  type RequiredPermission,
} from '../decorators/require-permission.decorator';
import { getUserSession } from '../auth/session';
import { RolesService } from '../../routes/roles/roles.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.getAllAndOverride<RequiredPermission | undefined>(
        PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const session = getUserSession(request);
    const userId = session?.user?.id;

    if (!userId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    try {
      const { permissions } =
        await this.rolesService.getPermissionsForUser(userId);

      const resourcePerms = permissions[required.resource];
      const hasPermission =
        resourcePerms?.includes(required.permission) ?? false;

      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error('Failed to resolve permissions', error);
      throw new InternalServerErrorException(
        'Failed to resolve user permissions',
      );
    }
  }
}
