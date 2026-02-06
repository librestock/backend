import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  getUserIdFromSession,
  getUserSession,
  type AuthRequest,
} from '../auth/session';
import {
  AUDIT_METADATA_KEY,
  AuditMetadata,
} from '../decorators/auditable.decorator';
import {
  AuditLogService,
  AuditContext,
} from '../../routes/audit-logs/audit-log.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditMetadata = this.reflector.get<AuditMetadata>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const auditContext = this.extractAuditContext(request);

    return next.handle().pipe(
      tap({
        next: (response) => {
          this.handleSuccessfulRequest(
            auditMetadata,
            auditContext,
            request,
            response,
          );
        },
        error: () => {
          // Don't log audit for failed requests
        },
      }),
    );
  }

  private extractAuditContext(request: AuthRequest): AuditContext {
    const session = getUserSession(request);
    return {
      userId: getUserIdFromSession(session),
      ipAddress: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    };
  }

  private handleSuccessfulRequest(
    metadata: AuditMetadata,
    context: AuditContext,
    request: AuthRequest,
    response: unknown,
  ): void {
    const entityId = this.extractEntityId(metadata, request, response);

    if (!entityId) {
      this.logger.warn(
        `Could not extract entity ID for audit log: ${metadata.action} on ${metadata.entityType}`,
      );
      return;
    }

    if (Array.isArray(entityId)) {
      this.auditLogService
        .logBulk({
          action: metadata.action,
          entityType: metadata.entityType,
          entityIds: entityId,
          context,
        })
        .catch((error) => {
          this.logger.error('Failed to create bulk audit log', error);
        });
    } else {
      this.auditLogService
        .log({
          action: metadata.action,
          entityType: metadata.entityType,
          entityId,
          context,
          changes: null,
        })
        .catch((error) => {
          this.logger.error('Failed to create audit log', error);
        });
    }
  }

  private extractEntityId(
    metadata: AuditMetadata,
    request: AuthRequest,
    response: unknown,
  ): string | string[] | null {
    const fromParams = this.getEntityIdFromParams(metadata, request);
    if (fromParams) {
      return fromParams;
    }

    const fromBody = this.getEntityIdFromBody(metadata, request);
    if (fromBody) {
      return fromBody;
    }

    const fromResponse = this.getEntityIdFromResponse(metadata, response);
    if (fromResponse) {
      return fromResponse;
    }

    const fromDefaults = this.getEntityIdFromDefaults(request, response);
    if (fromDefaults) {
      return fromDefaults;
    }

    const fromBulk = this.getBulkEntityIds(response);
    if (fromBulk) {
      return fromBulk;
    }

    return null;
  }

  private getEntityIdFromParams(
    metadata: AuditMetadata,
    request: AuthRequest,
  ): string | null {
    if (metadata.entityIdParam && request.params[metadata.entityIdParam]) {
      return request.params[metadata.entityIdParam];
    }
    return null;
  }

  private getEntityIdFromBody(
    metadata: AuditMetadata,
    request: AuthRequest,
  ): string | string[] | null {
    if (metadata.entityIdFromBody && request.body) {
      return this.getNestedValue(request.body, metadata.entityIdFromBody);
    }
    return null;
  }

  private getEntityIdFromResponse(
    metadata: AuditMetadata,
    response: unknown,
  ): string | string[] | null {
    if (metadata.entityIdFromResponse && response) {
      return this.getNestedValue(response, metadata.entityIdFromResponse);
    }
    return null;
  }

  private getEntityIdFromDefaults(
    request: AuthRequest,
    response: unknown,
  ): string | null {
    if (request.params.id) {
      return request.params.id;
    }

    if (response && typeof response === 'object' && 'id' in response) {
      return (response as { id: string }).id;
    }

    return null;
  }

  private getBulkEntityIds(response: unknown): string[] | null {
    if (
      response &&
      typeof response === 'object' &&
      'succeeded' in response &&
      Array.isArray((response as { succeeded: string[] }).succeeded)
    ) {
      return (response as { succeeded: string[] }).succeeded;
    }

    return null;
  }

  private getNestedValue(obj: unknown, path: string): string | string[] | null {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return null;
      }
      if (typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }

    if (typeof current === 'string') {
      return current;
    }

    if (
      Array.isArray(current) &&
      current.every((item) => typeof item === 'string')
    ) {
      return current;
    }

    return null;
  }
}
