import { Effect } from 'effect';
import { eq, ilike, sql, type SQL } from 'drizzle-orm';
import type { SupplierQueryDto } from '@stocket/types/suppliers';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
} from '@stocket/types/common';
import { makeTryAsync } from '../../platform/try-async';
import { DrizzleDatabase } from '../../platform/drizzle';
import { suppliers } from '../../platform/db/schema';
import { TenantQuery } from '../../platform/tenant-query';
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
  '@stocket/effect/suppliers/SuppliersRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;
      const tenantQuery = yield* TenantQuery;

      const findAllPaginated = (query: SupplierQueryDto) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenant(
            suppliers,
            ...buildSupplierFilters(query),
          );
          return yield* tryAsync('list suppliers', async () => {
            const { page, limit, skip } = resolvePaginationWindow(
              query.page,
              query.limit,
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
          const where = yield* tenantQuery.whereTenantId(suppliers, id);
          return yield* tryAsync('load supplier', async () => {
            const rows = await db
              .select()
              .from(suppliers)
              .where(where)
              .limit(1);
            return rows[0] ?? null;
          });
        });

      const existsById = (id: string) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenantId(suppliers, id);
          return yield* tryAsync('check supplier existence', async () => {
            const rows = await db
              .select({ id: suppliers.id })
              .from(suppliers)
              .where(where)
              .limit(1);
            return rows.length > 0;
          });
        });

      const create = (data: typeof suppliers.$inferInsert) =>
        Effect.gen(function* () {
          const values = yield* tenantQuery.insertValues(data);
          return yield* tryAsync('create supplier', async () => {
            const rows = await db.insert(suppliers).values(values).returning();
            return rows[0]!;
          });
        });

      const update = (
        id: string,
        data: Omit<Partial<typeof suppliers.$inferInsert>, 'tenant_id'>,
      ) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenantId(suppliers, id);
          return yield* tryAsync('update supplier', async () => {
            const { tenant_id: _tenantId, ...updateData } = data as Partial<
              typeof suppliers.$inferInsert
            >;
            const rows = await db
              .update(suppliers)
              .set({ ...updateData, updated_at: new Date() })
              .where(where)
              .returning({ id: suppliers.id });
            return rows.length;
          });
        });

      const remove = (id: string) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenantId(suppliers, id);
          return yield* tryAsync('delete supplier', async () => {
            await db.delete(suppliers).where(where);
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
    dependencies: [TenantQuery.Default],
  },
) {}
