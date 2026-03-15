import { Context, Effect } from 'effect';
import {
  type AuditLogResponseDto,
  type PaginatedAuditLogsResponseDto,
  type AuditEntityType,
} from '@librestock/types/audit-logs';
import type { AuditLogQueryOptions } from './repository';
import { toPaginatedResponse } from '../../../common/utils/pagination.utils';
import {
  AuditLogNotFound,
  AuditLogsInfrastructureError,
} from '../../../routes/audit-logs/audit-logs.errors';
import { AuditLog } from '../../../routes/audit-logs/entities/audit-log.entity';
import { AuditLogsRepository } from './repository';

const auditLogsTryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new AuditLogsInfrastructureError({
        action,
        cause,
        message: `Audit logs service failed to ${action}`,
      }),
  });

const toAuditLogResponseDto = (auditLog: AuditLog): AuditLogResponseDto => ({
  id: auditLog.id,
  user_id: auditLog.user_id,
  action: auditLog.action,
  entity_type: auditLog.entity_type,
  entity_id: auditLog.entity_id,
  changes: auditLog.changes,
  ip_address: auditLog.ip_address,
  user_agent: auditLog.user_agent,
  created_at: auditLog.created_at,
});

export interface AuditLogsService {
  readonly query: (
    query: AuditLogQueryOptions,
  ) => Effect.Effect<PaginatedAuditLogsResponseDto, AuditLogsInfrastructureError>;
  readonly findById: (
    id: string,
  ) => Effect.Effect<AuditLogResponseDto, AuditLogNotFound | AuditLogsInfrastructureError>;
  readonly getEntityHistory: (
    entityType: AuditEntityType,
    entityId: string,
  ) => Effect.Effect<AuditLogResponseDto[], AuditLogsInfrastructureError>;
  readonly getUserHistory: (
    userId: string,
  ) => Effect.Effect<AuditLogResponseDto[], AuditLogsInfrastructureError>;
}

export const AuditLogsService = Context.GenericTag<AuditLogsService>(
  '@librestock/effect/AuditLogsService',
);

export const makeAuditLogsService = Effect.gen(function* () {
  const repository = yield* AuditLogsRepository;

  const getAuditLogOrFail = (
    id: string,
  ): Effect.Effect<
    AuditLogResponseDto,
    AuditLogNotFound | AuditLogsInfrastructureError
  > =>
    Effect.flatMap(
      auditLogsTryAsync('load audit log', () => repository.findById(id)),
      (auditLog) =>
        auditLog
          ? Effect.succeed(toAuditLogResponseDto(auditLog))
          : Effect.fail(
              new AuditLogNotFound({
                id,
                message: `Audit log with ID ${id} not found`,
              }),
            ),
    );

  return {
    query: (query) =>
      Effect.map(
        auditLogsTryAsync('query audit logs', () =>
          repository.findPaginated(query),
        ),
        (result) => toPaginatedResponse(result, toAuditLogResponseDto),
      ),
    findById: getAuditLogOrFail,
    getEntityHistory: (entityType, entityId) =>
      Effect.map(
        auditLogsTryAsync('load entity audit history', () =>
          repository.findByEntityId(entityType, entityId),
        ),
        (auditLogs) => auditLogs.map(toAuditLogResponseDto),
      ),
    getUserHistory: (userId) =>
      Effect.map(
        auditLogsTryAsync('load user audit history', () =>
          repository.findByUserId(userId),
        ),
        (auditLogs) => auditLogs.map(toAuditLogResponseDto),
      ),
  } satisfies AuditLogsService;
});
