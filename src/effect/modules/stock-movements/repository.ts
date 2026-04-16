import { Effect } from 'effect';
import { eq, or, gte, lte, and, sql, type SQL, desc } from 'drizzle-orm';
import type { StockMovementQueryDto } from '@librestock/types/stock-movements';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
} from '../../platform/drizzle-query.utils';
import { makeTryAsync } from '../../platform/try-async';
import { DrizzleDatabase } from '../../platform/drizzle';
import { stockMovements } from '../../platform/db/schema';
import { StockMovementsInfrastructureError } from './stock-movements.errors';

const tryAsync = makeTryAsync(
  (action, cause) =>
    new StockMovementsInfrastructureError({
      action,
      cause,
      messageKey: 'stockMovements.repositoryFailed',
    }),
);

const withRelations = {
  product: { columns: { id: true, name: true, sku: true } },
  fromLocation: { columns: { id: true, name: true } },
  toLocation: { columns: { id: true, name: true } },
} as const;

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

          const data = await db.query.stockMovements.findMany({
            where,
            with: withRelations,
            orderBy: desc(stockMovements.created_at),
            offset: skip,
            limit,
          });

          return toRepositoryPaginatedResult(data, total, page, limit);
        });

      const findById = (id: string) =>
        tryAsync('find stock movement by id', () =>
          db.query.stockMovements
            .findFirst({
              where: eq(stockMovements.id, id),
              with: withRelations,
            })
            .then((row) => row ?? null),
        );

      const findByProductId = (productId: string) =>
        tryAsync('find stock movements by product', () =>
          db.query.stockMovements.findMany({
            where: eq(stockMovements.product_id, productId),
            with: withRelations,
            orderBy: desc(stockMovements.created_at),
          }),
        );

      const findByLocationId = (locationId: string) =>
        tryAsync('find stock movements by location', () =>
          db.query.stockMovements.findMany({
            where: or(
              eq(stockMovements.from_location_id, locationId),
              eq(stockMovements.to_location_id, locationId),
            ),
            with: withRelations,
            orderBy: desc(stockMovements.created_at),
          }),
        );

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
