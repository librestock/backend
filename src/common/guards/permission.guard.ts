import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, Resource } from '@librestock/types';
import { DataSource } from 'typeorm';
import {
  PERMISSION_KEY,
  type RequiredPermission,
} from '../decorators/require-permission.decorator';
import { getUserSession } from '../auth/session';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
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
      const rows: { resource: string; permission: string }[] =
        await this.dataSource.query(
          `SELECT rp.resource, rp.permission
           FROM user_roles ur
           JOIN role_permissions rp ON rp.role_id = ur.role_id
           WHERE ur.user_id = $1`,
          [userId],
        );

      const resources = new Set(Object.values(Resource));
      const permissions = new Set(Object.values(Permission));

      const typedRows = rows.filter(
        (
          row,
        ): row is { resource: Resource; permission: Permission } =>
          resources.has(row.resource as Resource) &&
          permissions.has(row.permission as Permission),
      );

      const hasPermission = typedRows.some(
        (row) =>
          row.resource === required.resource &&
          row.permission === required.permission,
      );

      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error('Failed to resolve permissions from database', error);
      throw new InternalServerErrorException(
        'Failed to resolve user permissions',
      );
    }
  }
}
