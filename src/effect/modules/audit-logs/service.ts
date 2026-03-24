import { Effect } from 'effect';
import {
  type AuditLogResponseDto,
  type PaginatedAuditLogsResponseDto,
  type AuditEntityType,
} from '@librestock/types/audit-logs';
import { toPaginatedResponse } from '../../platform/pagination.utils';
import type { auditLogs } from '../../platform/db/schema';
import type { AuditLogQueryOptions } from './repository';
import {
  AuditLogNotFound,
  type AuditLogsInfrastructureError,
} from './audit-logs.errors';
import { AuditLogsRepository } from './repository';

type AuditLog = typeof auditLogs.$inferSelect;

const toAuditLogResponseDto = (auditLog: AuditLog): AuditLogResponseDto => ({
  id: auditLog.id,
  user_id: auditLog.user_id,
  action: auditLog.action,
  entity_type: auditLog.entity_type,
  entity_id: auditLog.entity_id,
  changes: auditLog.changes as AuditLogResponseDto['changes'],
  ip_address: auditLog.ip_address,
  user_agent: auditLog.user_agent,
  created_at: auditLog.created_at,
});

export class AuditLogsService extends Effect.Service<AuditLogsService>()(
  '@librestock/effect/AuditLogsService',
  {
    effect: Effect.gen(function* () {
      const repository = yield* AuditLogsRepository;

      const getAuditLogOrFail = (
        id: string,
      ): Effect.Effect<
        AuditLogResponseDto,
        AuditLogNotFound | AuditLogsInfrastructureError
      > =>
        Effect.flatMap(repository.findById(id), (auditLog) =>
          auditLog
            ? Effect.succeed(toAuditLogResponseDto(auditLog))
            : Effect.fail(
                new AuditLogNotFound({
                  id,
                  messageKey: 'auditLogs.notFound',
                }),
              ),
        );

      const query = (
        queryOptions: AuditLogQueryOptions,
      ): Effect.Effect<
        PaginatedAuditLogsResponseDto,
        AuditLogsInfrastructureError
      > =>
        Effect.map(repository.findPaginated(queryOptions), (result) =>
          toPaginatedResponse(result, toAuditLogResponseDto),
        );

      const findById = getAuditLogOrFail;

      const getEntityHistory = (
        entityType: AuditEntityType,
        entityId: string,
      ): Effect.Effect<AuditLogResponseDto[], AuditLogsInfrastructureError> =>
        Effect.map(
          repository.findByEntityId(entityType, entityId),
          (auditLogs) => auditLogs.map(toAuditLogResponseDto),
        );

      const getUserHistory = (
        userId: string,
      ): Effect.Effect<AuditLogResponseDto[], AuditLogsInfrastructureError> =>
        Effect.map(repository.findByUserId(userId), (auditLogs) =>
          auditLogs.map(toAuditLogResponseDto),
        );

      return { query, findById, getEntityHistory, getUserHistory };
    }),
    dependencies: [AuditLogsRepository.Default],
  },
) {}
