import { Effect } from 'effect';
import { eq, ilike, and, sql, type SQL } from 'drizzle-orm';
import type { SupplierQueryDto } from '@librestock/types/suppliers';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
} from '../../platform/drizzle-query.utils';
import { DrizzleDatabase } from '../../platform/drizzle';
import { suppliers } from '../../platform/db/schema';
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

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new SuppliersInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

export class SuppliersRepository extends Effect.Service<SuppliersRepository>()(
  '@librestock/effect/SuppliersRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const findAllPaginated = (query: SupplierQueryDto) =>
        tryAsync('list suppliers', async () => {
          const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);
          const conditions = buildSupplierFilters(query);
          const where = conditions.length > 0 ? and(...conditions) : undefined;

          const [countResult, data] = await Promise.all([
            db.select({ count: sql<number>`count(*)::int` }).from(suppliers).where(where),
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

      const findById = (id: string) =>
        tryAsync('load supplier', async () => {
          const rows = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
          return rows[0] ?? null;
        });

      const existsById = (id: string) =>
        tryAsync('check supplier existence', async () => {
          const rows = await db
            .select({ id: suppliers.id })
            .from(suppliers)
            .where(eq(suppliers.id, id))
            .limit(1);
          return rows.length > 0;
        });

      const create = (data: typeof suppliers.$inferInsert) =>
        tryAsync('create supplier', async () => {
          const rows = await db.insert(suppliers).values(data).returning();
          return rows[0]!;
        });

      const update = (id: string, data: Partial<typeof suppliers.$inferInsert>) =>
        tryAsync('update supplier', async () => {
          const rows = await db
            .update(suppliers)
            .set({ ...data, updated_at: new Date() })
            .where(eq(suppliers.id, id))
            .returning({ id: suppliers.id });
          return rows.length;
        });

      const remove = (id: string) =>
        tryAsync('delete supplier', async () => {
          await db.delete(suppliers).where(eq(suppliers.id, id));
        });

      return { findAllPaginated, findById, existsById, create, update, delete: remove };
    }),
  },
) {}
