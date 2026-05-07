import { Effect } from 'effect';
import { eq, and, asc, isNull, sql, type SQL } from 'drizzle-orm';
import type {
  CreateAreaDto,
  UpdateAreaDto,
  AreaQueryDto,
} from '@librestock/types/areas';
import { makeTryAsync } from '../../platform/try-async';
import { DrizzleDatabase } from '../../platform/drizzle';
import { areas, locations } from '../../platform/db/schema';
import { requireRequestTenantId } from '../../platform/tenant-context';
import { AreasInfrastructureError } from './areas.errors';

type AreaRow = typeof areas.$inferSelect;
type AreaWithChildren = AreaRow & { children?: AreaWithChildren[] };

const tryAsync = makeTryAsync(
  (action, cause) =>
    new AreasInfrastructureError({
      action,
      cause,
      messageKey: 'areas.repositoryFailed',
    }),
);

export class AreasRepository extends Effect.Service<AreasRepository>()(
  '@librestock/effect/areas/AreasRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const loadChildrenRecursively = async (
        area: AreaWithChildren,
        tenantId: string,
      ): Promise<void> => {
        const children = await db
          .select()
          .from(areas)
          .where(
            and(
              eq(areas.tenant_id, tenantId),
              eq(areas.parent_id, area.id),
            ),
          )
          .orderBy(asc(areas.name));

        area.children = children;

        for (const child of children) {
          await loadChildrenRecursively(child, tenantId);
        }
      };

      const create = (dto: CreateAreaDto) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('create area', async () => {
            const rows = await db
              .insert(areas)
              .values({
                ...dto,
                tenant_id: tenantId,
                parent_id: dto.parent_id ?? null,
                code: dto.code ?? '',
                description: dto.description ?? '',
                is_active: dto.is_active ?? true,
              })
              .returning();
            return rows[0]!;
          });
        });

      const findAll = (query: AreaQueryDto) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('list areas', async () => {
            const conditions: SQL[] = [eq(areas.tenant_id, tenantId)];

            if (query.location_id) {
              conditions.push(eq(areas.location_id, query.location_id));
            }
            if (query.parent_id) {
              conditions.push(eq(areas.parent_id, query.parent_id));
            }
            if (query.root_only) {
              conditions.push(isNull(areas.parent_id));
            }
            if (query.is_active !== undefined) {
              conditions.push(eq(areas.is_active, query.is_active));
            }

            return db
              .select()
              .from(areas)
              .where(and(...conditions))
              .orderBy(asc(areas.name));
          });
        });

      const findById = (id: string) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('load area', async () => {
            const rows = await db
              .select({
                area: areas,
                location: locations,
              })
              .from(areas)
              .leftJoin(locations, eq(areas.location_id, locations.id))
              .where(and(eq(areas.tenant_id, tenantId), eq(areas.id, id)))
              .limit(1);

            if (!rows[0]) return null;
            return { ...rows[0].area, location: rows[0].location };
          });
        });

      const findByIdWithChildren = (id: string) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('load area with children', async () => {
            const rows = await db
              .select({
                area: areas,
                location: locations,
              })
              .from(areas)
              .leftJoin(locations, eq(areas.location_id, locations.id))
              .where(and(eq(areas.tenant_id, tenantId), eq(areas.id, id)))
              .limit(1);

            if (!rows[0]) return null;

            const children = await db
              .select()
              .from(areas)
              .where(
                and(
                  eq(areas.tenant_id, tenantId),
                  eq(areas.parent_id, id),
                ),
              );

            return { ...rows[0].area, location: rows[0].location, children };
          });
        });

      const findHierarchyByLocationId = (locationId: string) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('load area hierarchy', async () => {
            const rootAreas: AreaWithChildren[] = await db
              .select()
              .from(areas)
              .where(
                and(
                  eq(areas.tenant_id, tenantId),
                  eq(areas.location_id, locationId),
                  isNull(areas.parent_id),
                ),
              )
              .orderBy(asc(areas.name));

            for (const area of rootAreas) {
              await loadChildrenRecursively(area, tenantId);
            }

            return rootAreas;
          });
        });

      const update = (id: string, dto: UpdateAreaDto) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('update area', async () => {
            const existing = await db
              .select({
                area: areas,
                location: locations,
              })
              .from(areas)
              .leftJoin(locations, eq(areas.location_id, locations.id))
              .where(and(eq(areas.tenant_id, tenantId), eq(areas.id, id)))
              .limit(1);

            if (!existing[0]) return null;

            await db
              .update(areas)
              .set({ ...dto, updated_at: new Date() })
              .where(and(eq(areas.tenant_id, tenantId), eq(areas.id, id)));

            const updated = await db
              .select({
                area: areas,
                location: locations,
              })
              .from(areas)
              .leftJoin(locations, eq(areas.location_id, locations.id))
              .where(and(eq(areas.tenant_id, tenantId), eq(areas.id, id)))
              .limit(1);

            return updated[0]
              ? { ...updated[0].area, location: updated[0].location }
              : null;
          });
        });

      const remove = (id: string) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('delete area', async () => {
            const result = await db
              .delete(areas)
              .where(and(eq(areas.tenant_id, tenantId), eq(areas.id, id)))
              .returning({ id: areas.id });
            return result.length > 0;
          });
        });

      const existsById = (id: string) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('check area existence', async () => {
            const rows = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(areas)
              .where(and(eq(areas.tenant_id, tenantId), eq(areas.id, id)));
            return (rows[0]?.count ?? 0) > 0;
          });
        });

      return {
        create,
        findAll,
        findById,
        findByIdWithChildren,
        findHierarchyByLocationId,
        update,
        delete: remove,
        existsById,
      };
    }),
  },
) {}
