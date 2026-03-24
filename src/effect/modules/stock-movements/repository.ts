import { Effect } from 'effect';
import { eq, or, gte, lte, and, sql, type SQL } from 'drizzle-orm';
import type { StockMovementQueryDto } from '@librestock/types/stock-movements';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
} from '../../platform/drizzle-query.utils';
import { DrizzleDatabase } from '../../platform/drizzle';
import { stockMovements } from '../../platform/db/schema';
import { StockMovementsInfrastructureError } from './stock-movements.errors';
import type { StockMovementWithRelations } from './stock-movements.utils';

type RawRow = Record<string, any>;

/** Extract rows array from a raw `db.execute()` result (handles both pg and test shapes). */
function extractRows(result: unknown): RawRow[] {
  const res = result as { rows?: RawRow[] };
  return res.rows ?? (result as RawRow[]);
}

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new StockMovementsInfrastructureError({
        action,
        cause,
        messageKey: 'stockMovements.repositoryFailed',
      }),
  });

function buildStockMovementFilters(query: StockMovementQueryDto): SQL[] {
  const conditions: SQL[] = [];
  if (query.product_id) {
    conditions.push(eq(stockMovements.product_id, query.product_id));
  }
  if (query.location_id) {
    conditions.push(
      or(
        eq(stockMovements.from_location_id, query.location_id),
        eq(stockMovements.to_location_id, query.location_id),
      )!,
    );
  }
  if (query.reason) {
    conditions.push(eq(stockMovements.reason, query.reason));
  }
  if (query.date_from) {
    conditions.push(gte(stockMovements.created_at, new Date(query.date_from)));
  }
  if (query.date_to) {
    conditions.push(lte(stockMovements.created_at, new Date(query.date_to)));
  }
  return conditions;
}

export class StockMovementsRepository extends Effect.Service<StockMovementsRepository>()(
  '@librestock/effect/StockMovementsRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const findAllPaginated = (query: StockMovementQueryDto) =>
        tryAsync('list stock movements paginated', async () => {
          const { page, limit, skip } = resolvePaginationWindow(
            query.page,
            query.limit,
          );
          const conditions = buildStockMovementFilters(query);
          const where = conditions.length > 0 ? and(...conditions) : undefined;

          const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(stockMovements)
            .where(where);

          const total = countResult?.count ?? 0;

          // For the joined query, we need raw SQL to handle two joins to the same table
          const rows = await db.execute(sql`
            SELECT
              sm.*,
              row_to_json(p.*) as product,
              row_to_json(fl.*) as "fromLocation",
              row_to_json(tl.*) as "toLocation"
            FROM stock_movements sm
            LEFT JOIN products p ON sm.product_id = p.id
            LEFT JOIN locations fl ON sm.from_location_id = fl.id
            LEFT JOIN locations tl ON sm.to_location_id = tl.id
            ${where ? sql`WHERE ${where}` : sql``}
            ORDER BY sm.created_at DESC
            OFFSET ${skip}
            LIMIT ${limit}
          `);

          const data = extractRows(rows).map(
            (r): StockMovementWithRelations => ({
              ...(r as typeof stockMovements.$inferSelect),
              product: r.product?.id ? r.product : null,
              fromLocation: r.fromLocation?.id ? r.fromLocation : null,
              toLocation: r.toLocation?.id ? r.toLocation : null,
            }),
          );

          return toRepositoryPaginatedResult(data, total, page, limit);
        });

      const findWithJoinsById = async (id: string) => {
        const rows = await db.execute(sql`
          SELECT
            sm.*,
            row_to_json(p.*) as product,
            row_to_json(fl.*) as "fromLocation",
            row_to_json(tl.*) as "toLocation"
          FROM stock_movements sm
          LEFT JOIN products p ON sm.product_id = p.id
          LEFT JOIN locations fl ON sm.from_location_id = fl.id
          LEFT JOIN locations tl ON sm.to_location_id = tl.id
          WHERE sm.id = ${id}
          LIMIT 1
        `);
        const row = extractRows(rows)[0];
        if (!row) return null;
        return {
          ...(row as typeof stockMovements.$inferSelect),
          product: row.product?.id ? row.product : null,
          fromLocation: row.fromLocation?.id ? row.fromLocation : null,
          toLocation: row.toLocation?.id ? row.toLocation : null,
        } satisfies StockMovementWithRelations;
      };

      const findById = (id: string) =>
        tryAsync('find stock movement by id', () => findWithJoinsById(id));

      const findByProductId = (productId: string) =>
        tryAsync('find stock movements by product', async () => {
          const rows = await db.execute(sql`
            SELECT
              sm.*,
              row_to_json(p.*) as product,
              row_to_json(fl.*) as "fromLocation",
              row_to_json(tl.*) as "toLocation"
            FROM stock_movements sm
            LEFT JOIN products p ON sm.product_id = p.id
            LEFT JOIN locations fl ON sm.from_location_id = fl.id
            LEFT JOIN locations tl ON sm.to_location_id = tl.id
            WHERE sm.product_id = ${productId}
            ORDER BY sm.created_at DESC
          `);
          return extractRows(rows).map(
            (r): StockMovementWithRelations => ({
              ...(r as typeof stockMovements.$inferSelect),
              product: r.product?.id ? r.product : null,
              fromLocation: r.fromLocation?.id ? r.fromLocation : null,
              toLocation: r.toLocation?.id ? r.toLocation : null,
            }),
          );
        });

      const findByLocationId = (locationId: string) =>
        tryAsync('find stock movements by location', async () => {
          const rows = await db.execute(sql`
            SELECT
              sm.*,
              row_to_json(p.*) as product,
              row_to_json(fl.*) as "fromLocation",
              row_to_json(tl.*) as "toLocation"
            FROM stock_movements sm
            LEFT JOIN products p ON sm.product_id = p.id
            LEFT JOIN locations fl ON sm.from_location_id = fl.id
            LEFT JOIN locations tl ON sm.to_location_id = tl.id
            WHERE sm.from_location_id = ${locationId} OR sm.to_location_id = ${locationId}
            ORDER BY sm.created_at DESC
          `);
          return extractRows(rows).map(
            (r): StockMovementWithRelations => ({
              ...(r as typeof stockMovements.$inferSelect),
              product: r.product?.id ? r.product : null,
              fromLocation: r.fromLocation?.id ? r.fromLocation : null,
              toLocation: r.toLocation?.id ? r.toLocation : null,
            }),
          );
        });

      const create = (data: typeof stockMovements.$inferInsert) =>
        tryAsync('create stock movement', async () => {
          const rows = await db.insert(stockMovements).values(data).returning();
          return rows[0]!;
        });

      return {
        findAllPaginated,
        findById,
        findByProductId,
        findByLocationId,
        create,
      };
    }),
  },
) {}
