import { Effect } from 'effect';
import {
  applyQuerySpecs,
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type QuerySpec,
  type RepositoryPaginatedResult,
} from '../../platform/query-spec.utils';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogsInfrastructureError } from './audit-logs.errors';
import {
  AuditAction,
  AuditEntityType,
  type AuditLogQueryDto,
} from '@librestock/types/audit-logs';

export interface AuditLogQueryOptions {
  readonly entity_type?: AuditEntityType;
  readonly entity_id?: string;
  readonly user_id?: string;
  readonly action?: AuditAction;
  readonly from_date?: Date;
  readonly to_date?: Date;
  readonly page?: number;
  readonly limit?: number;
}

export type PaginatedAuditLogs = RepositoryPaginatedResult<AuditLog>;

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new AuditLogsInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

type AuditLogQueryBuilderInput = Omit<AuditLogQueryDto, 'from_date' | 'to_date'> & {
  readonly from_date?: Date;
  readonly to_date?: Date;
};

const auditLogFilterSpec: QuerySpec<AuditLog, AuditLogQueryBuilderInput> = (
  queryBuilder,
  query,
) => {
  if (query.entity_type) {
    queryBuilder.andWhere('audit_log.entity_type = :entity_type', {
      entity_type: query.entity_type,
    });
  }

  if (query.entity_id) {
    queryBuilder.andWhere('audit_log.entity_id = :entity_id', {
      entity_id: query.entity_id,
    });
  }

  if (query.user_id) {
    queryBuilder.andWhere('audit_log.user_id = :user_id', {
      user_id: query.user_id,
    });
  }

  if (query.action) {
    queryBuilder.andWhere('audit_log.action = :action', {
      action: query.action,
    });
  }

  if (query.from_date) {
    queryBuilder.andWhere('audit_log.created_at >= :from_date', {
      from_date: query.from_date,
    });
  }

  if (query.to_date) {
    queryBuilder.andWhere('audit_log.created_at <= :to_date', {
      to_date: query.to_date,
    });
  }
};

const auditLogSortSpec: QuerySpec<AuditLog, AuditLogQueryBuilderInput> = (
  queryBuilder,
) => {
  queryBuilder.orderBy('audit_log.created_at', 'DESC');
};

export class AuditLogsRepository extends Effect.Service<AuditLogsRepository>()(
  '@librestock/effect/AuditLogsRepository',
  {
    effect: Effect.gen(function* () {
      const dataSource = yield* TypeOrmDataSource;
      const repo = dataSource.getRepository(AuditLog);

      const findPaginated = (options: AuditLogQueryOptions) =>
        tryAsync('query audit logs', async () => {
          const { page, limit, skip } = resolvePaginationWindow(
            options.page,
            options.limit,
          );
          const queryBuilder = applyQuerySpecs(
            repo.createQueryBuilder('audit_log'),
            {
              ...options,
              page,
              limit,
            },
            [auditLogFilterSpec, auditLogSortSpec],
          );

          const total = await queryBuilder.getCount();
          const data = await queryBuilder.skip(skip).take(limit).getMany();

          return toRepositoryPaginatedResult(data, total, page, limit);
        });

      const findById = (id: string) =>
        tryAsync('load audit log', () => repo.findOneBy({ id }));

      const findByEntityId = (entityType: AuditEntityType, entityId: string) =>
        tryAsync('load entity audit history', () =>
          repo.find({
            where: {
              entity_type: entityType,
              entity_id: entityId,
            },
            order: { created_at: 'DESC' },
          }),
        );

      const findByUserId = (userId: string) =>
        tryAsync('load user audit history', () =>
          repo.find({
            where: { user_id: userId },
            order: { created_at: 'DESC' },
          }),
        );

      return { findPaginated, findById, findByEntityId, findByUserId };
    }),
  },
) {}
