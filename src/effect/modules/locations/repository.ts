import { Effect } from 'effect';
import { eq, ilike, sql, type SQL } from 'drizzle-orm';
import type { LocationQueryDto } from '@librestock/types/locations';
import { LocationSortField } from '@librestock/types/locations';
import type { SortOrder } from '@librestock/types/common';
import { buildOrderBy } from '../../platform/drizzle-sort.utils';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
} from '../../platform/drizzle-query.utils';
import { makeTryAsync } from '../../platform/try-async';
import { DrizzleDatabase } from '../../platform/drizzle';
import { locations } from '../../platform/db/schema';
import { TenantQuery } from '../../platform/tenant-query';
import { LocationsInfrastructureError } from './locations.errors';

const tryAsync = makeTryAsync(
  (action, cause) =>
    new LocationsInfrastructureError({
      action,
      cause,
      messageKey: 'locations.repositoryFailed',
    }),
);

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

const locationSortColumns = {
  [LocationSortField.NAME]: locations.name,
  [LocationSortField.TYPE]: locations.type,
  [LocationSortField.CREATED_AT]: locations.created_at,
  [LocationSortField.UPDATED_AT]: locations.updated_at,
} as const;

function getLocationOrderBy(sortBy?: LocationSortField, sortOrder?: SortOrder) {
  return buildOrderBy(
    locationSortColumns,
    sortBy ?? LocationSortField.NAME,
    (sortOrder ?? 'ASC') as 'ASC' | 'DESC',
  );
}

export class LocationsRepository extends Effect.Service<LocationsRepository>()(
  '@librestock/effect/locations/LocationsRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;
      const tenantQuery = yield* TenantQuery;

      const findAllPaginated = (query: LocationQueryDto) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenant(
            locations,
            ...buildLocationFilters(query),
          );
          return yield* tryAsync('list locations', async () => {
            const { page, limit, skip } = resolvePaginationWindow(
              query.page,
              query.limit,
            );
            const orderBy = getLocationOrderBy(query.sort_by, query.sort_order);

            const [countResult, data] = await Promise.all([
              db
                .select({ count: sql<number>`count(*)::int` })
                .from(locations)
                .where(where),
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
        });

      const findAll = () =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenant(locations);
          return yield* tryAsync('list all locations', () =>
            db
              .select()
              .from(locations)
              .where(where)
              .orderBy(sql`"name" ASC`),
          );
        });

      const findById = (id: string) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenantId(locations, id);
          return yield* tryAsync('load location', async () => {
            const rows = await db
              .select()
              .from(locations)
              .where(where)
              .limit(1);
            return rows[0] ?? null;
          });
        });

      const existsById = (id: string) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenantId(locations, id);
          return yield* tryAsync('check location existence', async () => {
            const rows = await db
              .select({ id: locations.id })
              .from(locations)
              .where(where)
              .limit(1);
            return rows.length > 0;
          });
        });

      const create = (data: typeof locations.$inferInsert) =>
        Effect.gen(function* () {
          const values = yield* tenantQuery.insertValues(data);
          return yield* tryAsync('create location', async () => {
            const rows = await db.insert(locations).values(values).returning();
            return rows[0]!;
          });
        });

      const update = (
        id: string,
        data: Omit<Partial<typeof locations.$inferInsert>, 'tenant_id'>,
      ) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenantId(locations, id);
          return yield* tryAsync('update location', async () => {
            const { tenant_id: _tenantId, ...updateData } = data as Partial<
              typeof locations.$inferInsert
            >;
            const rows = await db
              .update(locations)
              .set({ ...updateData, updated_at: new Date() })
              .where(where)
              .returning({ id: locations.id });
            return rows.length;
          });
        });

      const remove = (id: string) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenantId(locations, id);
          return yield* tryAsync('delete location', async () => {
            await db.delete(locations).where(where);
          });
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
    dependencies: [TenantQuery.Default],
  },
) {}
