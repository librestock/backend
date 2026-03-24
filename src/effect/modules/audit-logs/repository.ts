import { Effect } from 'effect';
import { eq, and, desc, gte, lte, sql, type SQL } from 'drizzle-orm';
import type {
  AuditAction,
  AuditEntityType,
} from '@librestock/types/audit-logs';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
} from '../../platform/drizzle-query.utils';
import { DrizzleDatabase } from '../../platform/drizzle';
import { auditLogs } from '../../platform/db/schema';
import { AuditLogsInfrastructureError } from './audit-logs.errors';

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

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new AuditLogsInfrastructureError({
        action,
        cause,
        messageKey: 'auditLogs.repositoryFailed',
      }),
  });

function buildAuditFilters(options: AuditLogQueryOptions): SQL[] {
  const conditions: SQL[] = [];
  if (options.entity_type) {
    conditions.push(eq(auditLogs.entity_type, options.entity_type));
  }
  if (options.entity_id) {
    conditions.push(eq(auditLogs.entity_id, options.entity_id));
  }
  if (options.user_id) {
    conditions.push(eq(auditLogs.user_id, options.user_id));
  }
  if (options.action) {
    conditions.push(eq(auditLogs.action, options.action));
  }
  if (options.from_date) {
    conditions.push(gte(auditLogs.created_at, options.from_date));
  }
  if (options.to_date) {
    conditions.push(lte(auditLogs.created_at, options.to_date));
  }
  return conditions;
}

export class AuditLogsRepository extends Effect.Service<AuditLogsRepository>()(
  '@librestock/effect/AuditLogsRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const findPaginated = (options: AuditLogQueryOptions) =>
        tryAsync('query audit logs', async () => {
          const { page, limit, skip } = resolvePaginationWindow(
            options.page,
            options.limit,
          );
          const conditions = buildAuditFilters(options);
          const where = conditions.length > 0 ? and(...conditions) : undefined;

          const [countResult, data] = await Promise.all([
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(auditLogs)
              .where(where),
            db
              .select()
              .from(auditLogs)
              .where(where)
              .orderBy(desc(auditLogs.created_at))
              .offset(skip)
              .limit(limit),
          ]);

          const total = countResult[0]?.count ?? 0;
          return toRepositoryPaginatedResult(data, total, page, limit);
        });

      const findById = (id: string) =>
        tryAsync('load audit log', async () => {
          const rows = await db
            .select()
            .from(auditLogs)
            .where(eq(auditLogs.id, id))
            .limit(1);
          return rows[0] ?? null;
        });

      const findByEntityId = (entityType: AuditEntityType, entityId: string) =>
        tryAsync('load entity audit history', () =>
          db
            .select()
            .from(auditLogs)
            .where(
              and(
                eq(auditLogs.entity_type, entityType),
                eq(auditLogs.entity_id, entityId),
              ),
            )
            .orderBy(desc(auditLogs.created_at)),
        );

      const findByUserId = (userId: string) =>
        tryAsync('load user audit history', () =>
          db
            .select()
            .from(auditLogs)
            .where(eq(auditLogs.user_id, userId))
            .orderBy(desc(auditLogs.created_at)),
        );

      return { findPaginated, findById, findByEntityId, findByUserId };
    }),
  },
) {}
