import { Effect } from 'effect';
import type { Schema } from 'effect';
import { eq, and, ilike, or, gte, lte, isNull, isNotNull, inArray, sql, type SQL } from 'drizzle-orm';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
} from '../../platform/drizzle-query.utils';
import { DrizzleDatabase, type DrizzleDb } from '../../platform/drizzle';
import { products, categories, suppliers } from '../../platform/db/schema';
import type { ProductQuerySchema } from './products.schema';
import { ProductsInfrastructureError } from './products.errors';

type ProductQueryDto = Schema.Schema.Type<typeof ProductQuerySchema>;

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new ProductsInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

interface ProductJoinRow {
  product: typeof products.$inferSelect;
  category: typeof categories.$inferSelect | null;
  supplier: typeof suppliers.$inferSelect | null;
}

function selectProductWithJoins(db: DrizzleDb) {
  return db
    .select({
      product: products,
      category: categories,
      supplier: suppliers,
    })
    .from(products)
    .leftJoin(categories, eq(products.category_id, categories.id))
    .leftJoin(suppliers, eq(products.primary_supplier_id, suppliers.id));
}

function mapProductRow(row: ProductJoinRow) {
  return {
    ...row.product,
    category: row.category,
    primary_supplier: row.supplier,
  };
}

export class ProductsRepository extends Effect.Service<ProductsRepository>()(
  '@librestock/effect/ProductsRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const findAllPaginated = (query: ProductQueryDto) =>
        tryAsync('list products paginated', async () => {
          const { page, limit, skip } = resolvePaginationWindow(
            query.page,
            query.limit,
          );

          const conditions: SQL[] = [];

          if (!query.include_deleted) {
            conditions.push(isNull(products.deleted_at));
          }
          if (query.search) {
            conditions.push(
              or(
                ilike(products.name, `%${query.search}%`),
                ilike(products.sku, `%${query.search}%`),
              )!,
            );
          }
          if (query.category_id) {
            conditions.push(eq(products.category_id, query.category_id));
          }
          if (query.primary_supplier_id) {
            conditions.push(eq(products.primary_supplier_id, query.primary_supplier_id));
          }
          if (query.is_active !== undefined) {
            conditions.push(eq(products.is_active, query.is_active));
          }
          if (query.is_perishable !== undefined) {
            conditions.push(eq(products.is_perishable, query.is_perishable));
          }
          if (query.min_price !== undefined && query.max_price !== undefined) {
            conditions.push(
              sql`${products.standard_price} BETWEEN ${query.min_price} AND ${query.max_price}`,
            );
          } else if (query.min_price !== undefined) {
            conditions.push(gte(products.standard_price, query.min_price));
          } else if (query.max_price !== undefined) {
            conditions.push(lte(products.standard_price, query.max_price));
          }

          const where = conditions.length > 0 ? and(...conditions) : undefined;
          const orderBy = sql.raw(`products."${query.sort_by}" ${query.sort_order}`);

          const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(products)
            .where(where);

          const total = countResult?.count ?? 0;

          const rows = await selectProductWithJoins(db)
            .where(where)
            .orderBy(orderBy)
            .offset(skip)
            .limit(limit);

          return toRepositoryPaginatedResult(rows.map(mapProductRow), total, page, limit);
        });

      const findAll = (includeDeleted = false) =>
        tryAsync('list all products', async () => {
          const where = includeDeleted ? undefined : isNull(products.deleted_at);
          const rows = await selectProductWithJoins(db)
            .where(where)
            .orderBy(sql`products."name" ASC`);
          return rows.map(mapProductRow);
        });

      const findById = (id: string, includeDeleted = false) =>
        tryAsync('find product by id', async () => {
          const conditions: SQL[] = [eq(products.id, id)];
          if (!includeDeleted) {
            conditions.push(isNull(products.deleted_at));
          }
          const rows = await selectProductWithJoins(db)
            .where(and(...conditions))
            .limit(1);
          return rows[0] ? mapProductRow(rows[0]) : null;
        });

      const findBySku = (sku: string, includeDeleted = false) =>
        tryAsync('find product by sku', async () => {
          const conditions: SQL[] = [eq(products.sku, sku)];
          if (!includeDeleted) {
            conditions.push(isNull(products.deleted_at));
          }
          const rows = await db
            .select()
            .from(products)
            .where(and(...conditions))
            .limit(1);
          return rows[0] ?? null;
        });

      const findByCategoryId = (categoryId: string) =>
        tryAsync('find products by category', async () => {
          const rows = await selectProductWithJoins(db)
            .where(
              and(
                eq(products.category_id, categoryId),
                isNull(products.deleted_at),
              ),
            )
            .orderBy(sql`products."name" ASC`);
          return rows.map(mapProductRow);
        });

      const findByCategoryIds = (categoryIds: string[]) =>
        tryAsync('find products by categories', async () => {
          const rows = await selectProductWithJoins(db)
            .where(
              and(
                inArray(products.category_id, categoryIds),
                isNull(products.deleted_at),
              ),
            )
            .orderBy(sql`products."name" ASC`);
          return rows.map(mapProductRow);
        });

      const findByIds = (ids: string[], includeDeleted = false) =>
        tryAsync('find products by ids', async () => {
          const conditions: SQL[] = [inArray(products.id, ids)];
          if (!includeDeleted) {
            conditions.push(isNull(products.deleted_at));
          }
          return db
            .select()
            .from(products)
            .where(and(...conditions));
        });

      const findDeletedByIds = (ids: string[]) =>
        tryAsync('find deleted products by ids', () =>
          db
            .select()
            .from(products)
            .where(
              and(inArray(products.id, ids), isNotNull(products.deleted_at)),
            ),
        );

      const existsById = (id: string) =>
        tryAsync('check product existence', async () => {
          const rows = await db
            .select({ id: products.id })
            .from(products)
            .where(and(eq(products.id, id), isNull(products.deleted_at)))
            .limit(1);
          return rows.length > 0;
        });

      const create = (data: typeof products.$inferInsert) =>
        tryAsync('create product', async () => {
          const rows = await db.insert(products).values(data).returning();
          return rows[0]!;
        });

      const update = (id: string, data: Partial<typeof products.$inferInsert>) =>
        tryAsync('update product', async () => {
          const rows = await db
            .update(products)
            .set({ ...data, updated_at: new Date() })
            .where(and(eq(products.id, id), isNull(products.deleted_at)))
            .returning({ id: products.id });
          return rows.length;
        });

      const updateMany = (ids: string[], data: Partial<typeof products.$inferInsert>) =>
        tryAsync('update multiple products', async () => {
          const rows = await db
            .update(products)
            .set({ ...data, updated_at: new Date() })
            .where(and(inArray(products.id, ids), isNull(products.deleted_at)))
            .returning({ id: products.id });
          return rows.length;
        });

      const softDelete = (id: string, deletedBy?: string) =>
        tryAsync('soft delete product', async () => {
          await db
            .update(products)
            .set({
              deleted_at: new Date(),
              deleted_by: deletedBy ?? null,
              updated_at: new Date(),
            })
            .where(and(eq(products.id, id), isNull(products.deleted_at)));
        });

      const softDeleteMany = (ids: string[], deletedBy?: string) =>
        tryAsync('soft delete multiple products', async () => {
          const rows = await db
            .update(products)
            .set({
              deleted_at: new Date(),
              deleted_by: deletedBy ?? null,
              updated_at: new Date(),
            })
            .where(and(inArray(products.id, ids), isNull(products.deleted_at)))
            .returning({ id: products.id });
          return rows.length;
        });

      const restore = (id: string) =>
        tryAsync('restore product', async () => {
          await db
            .update(products)
            .set({
              deleted_at: null,
              deleted_by: null,
              updated_at: new Date(),
            })
            .where(and(eq(products.id, id), isNotNull(products.deleted_at)));
        });

      const restoreMany = (ids: string[]) =>
        tryAsync('restore multiple products', async () => {
          const rows = await db
            .update(products)
            .set({
              deleted_at: null,
              deleted_by: null,
              updated_at: new Date(),
            })
            .where(and(inArray(products.id, ids), isNotNull(products.deleted_at)))
            .returning({ id: products.id });
          return rows.length;
        });

      const hardDelete = (id: string) =>
        tryAsync('hard delete product', async () => {
          await db.delete(products).where(eq(products.id, id));
        });

      const hardDeleteMany = (ids: string[]) =>
        tryAsync('hard delete multiple products', async () => {
          const rows = await db
            .delete(products)
            .where(inArray(products.id, ids))
            .returning({ id: products.id });
          return rows.length;
        });

      return {
        findAllPaginated,
        findAll,
        findById,
        findBySku,
        findByCategoryId,
        findByCategoryIds,
        findByIds,
        findDeletedByIds,
        existsById,
        create,
        update,
        updateMany,
        softDelete,
        softDeleteMany,
        restore,
        restoreMany,
        hardDelete,
        hardDeleteMany,
      };
    }),
  },
) {}
