import { Effect } from 'effect';
import { eq, ilike, and, sql, type SQL } from 'drizzle-orm';
import type { SupplierQueryDto } from '@librestock/types/suppliers';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
} from '../../platform/drizzle-query.utils';
import { makeTryAsync } from '../../platform/try-async';
import { DrizzleDatabase } from '../../platform/drizzle';
import { suppliers } from '../../platform/db/schema';
import { requireRequestTenantId } from '../../platform/tenant-context';
import { SuppliersInfrastructureError } from './suppliers.errors';

function buildSupplierFilters(query: SupplierQueryDto): SQL[] {
  const conditions: SQL[] = [];
  if (query.q) {
    conditions.push(ilike(suppliers.name, `%${query.q}%`));
  }
  if (query.is_active !== undefined) {
    conditions.push(eq(suppliers.is_active, query.is_active));
  }
  return conditions;
}

const tryAsync = makeTryAsync(
  (action, cause) =>
    new SuppliersInfrastructureError({
      action,
      cause,
      messageKey: 'suppliers.repositoryFailed',
    }),
);

export class SuppliersRepository extends Effect.Service<SuppliersRepository>()(
  '@librestock/effect/suppliers/SuppliersRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const findAllPaginated = (query: SupplierQueryDto) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('list suppliers', async () => {
            const { page, limit, skip } = resolvePaginationWindow(
              query.page,
              query.limit,
            );
            const where = and(
              eq(suppliers.tenant_id, tenantId),
              ...buildSupplierFilters(query),
            );

            const [countResult, data] = await Promise.all([
              db
                .select({ count: sql<number>`count(*)::int` })
                .from(suppliers)
                .where(where),
              db
                .select()
                .from(suppliers)
                .where(where)
                .orderBy(sql`"name" ASC`)
                .offset(skip)
                .limit(limit),
            ]);

            const total = countResult[0]?.count ?? 0;
            return toRepositoryPaginatedResult(data, total, page, limit);
          });
        });

      const findById = (id: string) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('load supplier', async () => {
            const rows = await db
              .select()
              .from(suppliers)
              .where(
                and(eq(suppliers.tenant_id, tenantId), eq(suppliers.id, id)),
              )
              .limit(1);
            return rows[0] ?? null;
          });
        });

      const existsById = (id: string) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('check supplier existence', async () => {
            const rows = await db
              .select({ id: suppliers.id })
              .from(suppliers)
              .where(
                and(eq(suppliers.tenant_id, tenantId), eq(suppliers.id, id)),
              )
              .limit(1);
            return rows.length > 0;
          });
        });

      const create = (data: typeof suppliers.$inferInsert) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('create supplier', async () => {
            const rows = await db
              .insert(suppliers)
              .values({ ...data, tenant_id: tenantId })
              .returning();
            return rows[0]!;
          });
        });

      const update = (
        id: string,
        data: Partial<typeof suppliers.$inferInsert>,
      ) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('update supplier', async () => {
            const rows = await db
              .update(suppliers)
              .set({ ...data, updated_at: new Date() })
              .where(
                and(eq(suppliers.tenant_id, tenantId), eq(suppliers.id, id)),
              )
              .returning({ id: suppliers.id });
            return rows.length;
          });
        });

      const remove = (id: string) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('delete supplier', async () => {
            await db
              .delete(suppliers)
              .where(
                and(eq(suppliers.tenant_id, tenantId), eq(suppliers.id, id)),
              );
          });
        });

      return {
        findAllPaginated,
        findById,
        existsById,
        create,
        update,
        delete: remove,
      };
    }),
  },
) {}
