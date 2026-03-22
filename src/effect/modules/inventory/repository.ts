import { Effect } from 'effect';
import { eq, and, ilike, or, gte, lte, desc, sql, isNull, type SQL } from 'drizzle-orm';
import type { InventoryQueryDto } from '@librestock/types/inventory';
import { InventorySortField } from '@librestock/types/inventory';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
} from '../../platform/drizzle-query.utils';
import { DrizzleDatabase, type DrizzleDb } from '../../platform/drizzle';
import { inventory, products, locations, areas } from '../../platform/db/schema';
import { InventoryInfrastructureError } from './inventory.errors';

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new InventoryInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

function buildInventoryFilters(query: InventoryQueryDto): SQL[] {
  const conditions: SQL[] = [];
  if (query.product_id) {
    conditions.push(eq(inventory.product_id, query.product_id));
  }
  if (query.location_id) {
    conditions.push(eq(inventory.location_id, query.location_id));
  }
  if (query.area_id) {
    conditions.push(eq(inventory.area_id, query.area_id));
  }
  if (query.search) {
    conditions.push(
      or(
        ilike(products.name, `%${query.search}%`),
        ilike(products.sku, `%${query.search}%`),
      )!,
    );
  }
  if (query.low_stock) {
    conditions.push(sql`${inventory.quantity} <= ${products.reorder_point}`);
  }
  if (query.expiring_soon) {
    conditions.push(
      sql`${inventory.expiry_date} IS NOT NULL AND ${inventory.expiry_date} <= NOW() + INTERVAL '30 days'`,
    );
  }
  if (query.min_quantity !== undefined && query.max_quantity !== undefined) {
    conditions.push(
      sql`${inventory.quantity} BETWEEN ${query.min_quantity} AND ${query.max_quantity}`,
    );
  } else if (query.min_quantity !== undefined) {
    conditions.push(gte(inventory.quantity, query.min_quantity));
  } else if (query.max_quantity !== undefined) {
    conditions.push(lte(inventory.quantity, query.max_quantity));
  }
  return conditions;
}

function getInventoryOrderBy(sortBy?: string, sortOrder?: string) {
  const col = sortBy ?? InventorySortField.UPDATED_AT;
  const dir = sortOrder ?? 'DESC';
  return sql.raw(`inventory."${col}" ${dir}`);
}

interface InventoryJoinRow {
  inv: typeof inventory.$inferSelect;
  product: typeof products.$inferSelect | null;
  location: typeof locations.$inferSelect | null;
  area: typeof areas.$inferSelect | null;
}

function selectInventoryWithJoins(db: DrizzleDb) {
  return db
    .select({
      inv: inventory,
      product: products,
      location: locations,
      area: areas,
    })
    .from(inventory)
    .leftJoin(products, eq(inventory.product_id, products.id))
    .leftJoin(locations, eq(inventory.location_id, locations.id))
    .leftJoin(areas, eq(inventory.area_id, areas.id));
}

function mapInventoryRow(row: InventoryJoinRow) {
  return {
    ...row.inv,
    product: row.product,
    location: row.location,
    area: row.area,
  };
}

export class InventoryRepository extends Effect.Service<InventoryRepository>()(
  '@librestock/effect/InventoryRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const findAllPaginated = (query: InventoryQueryDto) =>
        tryAsync('list inventory paginated', async () => {
          const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);
          const conditions = buildInventoryFilters(query);
          const where = conditions.length > 0 ? and(...conditions) : undefined;
          const orderBy = getInventoryOrderBy(query.sort_by, query.sort_order);

          // Count needs the products join for search/low_stock filters
          const [countResult] = await selectInventoryWithJoins(db)
            .where(where)
            .then(async () => {
              // Use a separate count query to avoid issues
              return db
                .select({ count: sql<number>`count(*)::int` })
                .from(inventory)
                .leftJoin(products, eq(inventory.product_id, products.id))
                .where(where);
            });

          const total = countResult?.count ?? 0;

          const rows = await selectInventoryWithJoins(db)
            .where(where)
            .orderBy(orderBy)
            .offset(skip)
            .limit(limit);

          return toRepositoryPaginatedResult(rows.map(mapInventoryRow), total, page, limit);
        });

      const findAll = () =>
        tryAsync('list all inventory', async () => {
          const rows = await selectInventoryWithJoins(db)
            .orderBy(desc(inventory.updated_at));
          return rows.map(mapInventoryRow);
        });

      const findById = (id: string) =>
        tryAsync('find inventory by id', async () => {
          const rows = await selectInventoryWithJoins(db)
            .where(eq(inventory.id, id))
            .limit(1);
          return rows[0] ? mapInventoryRow(rows[0]) : null;
        });

      const findByProductId = (productId: string) =>
        tryAsync('find inventory by product', async () => {
          const rows = await selectInventoryWithJoins(db)
            .where(eq(inventory.product_id, productId))
            .orderBy(desc(inventory.updated_at));
          return rows.map(mapInventoryRow);
        });

      const findByLocationId = (locationId: string) =>
        tryAsync('find inventory by location', async () => {
          const rows = await selectInventoryWithJoins(db)
            .where(eq(inventory.location_id, locationId))
            .orderBy(desc(inventory.updated_at));
          return rows.map(mapInventoryRow);
        });

      const findByProductAndLocation = (productId: string, locationId: string, areaId?: string | null) =>
        tryAsync('find inventory by product and location', async () => {
          const conditions: SQL[] = [
            eq(inventory.product_id, productId),
            eq(inventory.location_id, locationId),
          ];

          if (areaId) {
            conditions.push(eq(inventory.area_id, areaId));
          } else {
            conditions.push(isNull(inventory.area_id));
          }

          const rows = await selectInventoryWithJoins(db)
            .where(and(...conditions))
            .limit(1);

          return rows[0] ? mapInventoryRow(rows[0]) : null;
        });

      const create = (data: typeof inventory.$inferInsert) =>
        tryAsync('create inventory', async () => {
          const rows = await db.insert(inventory).values(data).returning();
          return rows[0]!;
        });

      const update = (id: string, data: Partial<typeof inventory.$inferInsert>) =>
        tryAsync('update inventory', async () => {
          const rows = await db
            .update(inventory)
            .set({ ...data, updated_at: new Date() })
            .where(eq(inventory.id, id))
            .returning({ id: inventory.id });
          return rows.length;
        });

      const adjustQuantity = (id: string, adjustment: number) =>
        tryAsync('adjust inventory quantity', async () => {
          const rows = await db
            .update(inventory)
            .set({
              quantity: sql`${inventory.quantity} + ${adjustment}`,
              updated_at: new Date(),
            })
            .where(
              and(
                eq(inventory.id, id),
                sql`${inventory.quantity} + ${adjustment} >= 0`,
              ),
            )
            .returning({ id: inventory.id });
          return rows.length;
        });

      const remove = (id: string) =>
        tryAsync('delete inventory', () =>
          db.delete(inventory).where(eq(inventory.id, id)),
        );

      return {
        findAllPaginated,
        findAll,
        findById,
        findByProductId,
        findByLocationId,
        findByProductAndLocation,
        create,
        update,
        adjustQuantity,
        delete: remove,
      };
    }),
  },
) {}
