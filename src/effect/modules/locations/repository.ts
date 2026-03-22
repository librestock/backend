import { Effect } from 'effect';
import { eq, ilike, sql, and, type SQL } from 'drizzle-orm';
import type { LocationQueryDto, LocationSortField } from '@librestock/types/locations';
import type { SortOrder } from '@librestock/types/common';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
} from '../../platform/drizzle-query.utils';
import { DrizzleDatabase } from '../../platform/drizzle';
import { locations } from '../../platform/db/schema';
import { LocationsInfrastructureError } from './locations.errors';

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new LocationsInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

function buildLocationFilters(query: LocationQueryDto): SQL[] {
  const conditions: SQL[] = [];
  if (query.search) {
    conditions.push(ilike(locations.name, `%${query.search}%`));
  }
  if (query.type) {
    conditions.push(eq(locations.type, query.type));
  }
  if (query.is_active !== undefined) {
    conditions.push(eq(locations.is_active, query.is_active));
  }
  return conditions;
}

function getLocationOrderBy(sortBy?: LocationSortField, sortOrder?: SortOrder) {
  const col = sortBy ?? 'name';
  const dir = sortOrder ?? 'ASC';
  return sql.raw(`"${col}" ${dir}`);
}

export class LocationsRepository extends Effect.Service<LocationsRepository>()(
  '@librestock/effect/LocationsRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const findAllPaginated = (query: LocationQueryDto) =>
        tryAsync('list locations', async () => {
          const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);
          const conditions = buildLocationFilters(query);
          const where = conditions.length > 0 ? and(...conditions) : undefined;
          const orderBy = getLocationOrderBy(query.sort_by, query.sort_order);

          const [countResult, data] = await Promise.all([
            db.select({ count: sql<number>`count(*)::int` }).from(locations).where(where),
            db
              .select()
              .from(locations)
              .where(where)
              .orderBy(orderBy)
              .offset(skip)
              .limit(limit),
          ]);

          const total = countResult[0]?.count ?? 0;
          return toRepositoryPaginatedResult(data, total, page, limit);
        });

      const findAll = () =>
        tryAsync('list all locations', () =>
          db
            .select()
            .from(locations)
            .orderBy(sql`"name" ASC`),
        );

      const findById = (id: string) =>
        tryAsync('load location', async () => {
          const rows = await db
            .select()
            .from(locations)
            .where(eq(locations.id, id))
            .limit(1);
          return rows[0] ?? null;
        });

      const existsById = (id: string) =>
        tryAsync('check location existence', async () => {
          const rows = await db
            .select({ id: locations.id })
            .from(locations)
            .where(eq(locations.id, id))
            .limit(1);
          return rows.length > 0;
        });

      const create = (data: typeof locations.$inferInsert) =>
        tryAsync('create location', async () => {
          const rows = await db.insert(locations).values(data).returning();
          return rows[0]!;
        });

      const update = (id: string, data: Partial<typeof locations.$inferInsert>) =>
        tryAsync('update location', async () => {
          const rows = await db
            .update(locations)
            .set({ ...data, updated_at: new Date() })
            .where(eq(locations.id, id))
            .returning({ id: locations.id });
          return rows.length;
        });

      const remove = (id: string) =>
        tryAsync('delete location', async () => {
          await db.delete(locations).where(eq(locations.id, id));
        });

      return {
        findAllPaginated,
        findAll,
        findById,
        existsById,
        create,
        update,
        delete: remove,
      };
    }),
  },
) {}
