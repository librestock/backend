import { Context, Effect } from 'effect';
import { Repository } from 'typeorm';
import {
  applyQuerySpecs,
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type QuerySpec,
  type RepositoryPaginatedResult,
} from '../../../common/utils/query-spec.utils';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { AuditLog } from '../../../routes/audit-logs/entities/audit-log.entity';
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

export interface AuditLogsRepository {
  readonly findPaginated: (
    options: AuditLogQueryOptions,
  ) => Promise<PaginatedAuditLogs>;
  readonly findById: (id: string) => Promise<AuditLog | null>;
  readonly findByEntityId: (
    entityType: AuditEntityType,
    entityId: string,
  ) => Promise<AuditLog[]>;
  readonly findByUserId: (userId: string) => Promise<AuditLog[]>;
}

export const AuditLogsRepository = Context.GenericTag<AuditLogsRepository>(
  '@librestock/effect/AuditLogsRepository',
);

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

const createAuditLogsRepository = (
  repository: Repository<AuditLog>,
): AuditLogsRepository => ({
  findPaginated: async (options) => {
    const { page, limit, skip } = resolvePaginationWindow(
      options.page,
      options.limit,
    );
    const queryBuilder = applyQuerySpecs(
      repository.createQueryBuilder('audit_log'),
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
  },
  findById: (id) => repository.findOneBy({ id }),
  findByEntityId: (entityType, entityId) =>
    repository.find({
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
      order: { created_at: 'DESC' },
    }),
  findByUserId: (userId) =>
    repository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    }),
});

export const makeAuditLogsRepository = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;

  return createAuditLogsRepository(dataSource.getRepository(AuditLog));
});
