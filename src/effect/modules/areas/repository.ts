import { Effect } from 'effect';
import { eq, and, asc, isNull, sql } from 'drizzle-orm';
import type {
  CreateAreaDto,
  UpdateAreaDto,
  AreaQueryDto,
} from '@librestock/types/areas';
import { DrizzleDatabase } from '../../platform/drizzle';
import { areas, locations } from '../../platform/db/schema';
import { AreasInfrastructureError } from './areas.errors';

type AreaRow = typeof areas.$inferSelect;
type AreaWithChildren = AreaRow & { children?: AreaWithChildren[] };

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new AreasInfrastructureError({
        action,
        cause,
        messageKey: 'areas.repositoryFailed',
      }),
  });

export class AreasRepository extends Effect.Service<AreasRepository>()(
  '@librestock/effect/AreasRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const loadChildrenRecursively = async (
        area: AreaWithChildren,
      ): Promise<void> => {
        const children = await db
          .select()
          .from(areas)
          .where(eq(areas.parent_id, area.id))
          .orderBy(asc(areas.name));

        area.children = children;

        for (const child of children) {
          await loadChildrenRecursively(child);
        }
      };

      const create = (dto: CreateAreaDto) =>
        tryAsync('create area', async () => {
          const rows = await db
            .insert(areas)
            .values({
              ...dto,
              parent_id: dto.parent_id ?? null,
              code: dto.code ?? '',
              description: dto.description ?? '',
              is_active: dto.is_active ?? true,
            })
            .returning();
          return rows[0]!;
        });

      const findAll = (query: AreaQueryDto) =>
        tryAsync('list areas', async () => {
          const conditions: ReturnType<typeof eq>[] = [];

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
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(asc(areas.name));
        });

      const findById = (id: string) =>
        tryAsync('load area', async () => {
          const rows = await db
            .select({
              area: areas,
              location: locations,
            })
            .from(areas)
            .leftJoin(locations, eq(areas.location_id, locations.id))
            .where(eq(areas.id, id))
            .limit(1);

          if (!rows[0]) return null;
          return { ...rows[0].area, location: rows[0].location };
        });

      const findByIdWithChildren = (id: string) =>
        tryAsync('load area with children', async () => {
          const rows = await db
            .select({
              area: areas,
              location: locations,
            })
            .from(areas)
            .leftJoin(locations, eq(areas.location_id, locations.id))
            .where(eq(areas.id, id))
            .limit(1);

          if (!rows[0]) return null;

          const children = await db
            .select()
            .from(areas)
            .where(eq(areas.parent_id, id));

          return { ...rows[0].area, location: rows[0].location, children };
        });

      const findHierarchyByLocationId = (locationId: string) =>
        tryAsync('load area hierarchy', async () => {
          const rootAreas: AreaWithChildren[] = await db
            .select()
            .from(areas)
            .where(
              and(eq(areas.location_id, locationId), isNull(areas.parent_id)),
            )
            .orderBy(asc(areas.name));

          for (const area of rootAreas) {
            await loadChildrenRecursively(area);
          }

          return rootAreas;
        });

      const update = (id: string, dto: UpdateAreaDto) =>
        tryAsync('update area', async () => {
          const existing = await db
            .select({
              area: areas,
              location: locations,
            })
            .from(areas)
            .leftJoin(locations, eq(areas.location_id, locations.id))
            .where(eq(areas.id, id))
            .limit(1);

          if (!existing[0]) return null;

          await db
            .update(areas)
            .set({ ...dto, updated_at: new Date() })
            .where(eq(areas.id, id));

          const updated = await db
            .select({
              area: areas,
              location: locations,
            })
            .from(areas)
            .leftJoin(locations, eq(areas.location_id, locations.id))
            .where(eq(areas.id, id))
            .limit(1);

          return updated[0]
            ? { ...updated[0].area, location: updated[0].location }
            : null;
        });

      const remove = (id: string) =>
        tryAsync('delete area', async () => {
          const result = await db
            .delete(areas)
            .where(eq(areas.id, id))
            .returning({ id: areas.id });
          return result.length > 0;
        });

      const existsById = (id: string) =>
        tryAsync('check area existence', async () => {
          const rows = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(areas)
            .where(eq(areas.id, id));
          return (rows[0]?.count ?? 0) > 0;
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
