import { Effect } from 'effect';
import { IsNull } from 'typeorm';
import type {
  CreateAreaDto,
  UpdateAreaDto,
  AreaQueryDto,
} from '@librestock/types/areas';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { Area } from './entities/area.entity';
import { AreasInfrastructureError } from './areas.errors';

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new AreasInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

export class AreasRepository extends Effect.Service<AreasRepository>()(
  '@librestock/effect/AreasRepository',
  {
    effect: Effect.gen(function* () {
      const dataSource = yield* TypeOrmDataSource;
      const repo = dataSource.getRepository(Area);

      const loadChildrenRecursively = async (area: Area): Promise<void> => {
        const children = await repo.find({
          where: { parent_id: area.id },
          order: { name: 'ASC' },
        });

        area.children = children;

        for (const child of children) {
          await loadChildrenRecursively(child);
        }
      };

      const create = (dto: CreateAreaDto) =>
        tryAsync('create area', async () => {
          const area = repo.create({
            ...dto,
            parent_id: dto.parent_id ?? null,
            code: dto.code ?? '',
            description: dto.description ?? '',
            is_active: dto.is_active ?? true,
          });
          return repo.save(area);
        });

      const findAll = (query: AreaQueryDto) =>
        tryAsync('list areas', async () => {
          const qb = repo.createQueryBuilder('area');

          if (query.location_id) {
            qb.andWhere('area.location_id = :location_id', {
              location_id: query.location_id,
            });
          }

          if (query.parent_id) {
            qb.andWhere('area.parent_id = :parent_id', {
              parent_id: query.parent_id,
            });
          }

          if (query.root_only) {
            qb.andWhere('area.parent_id IS NULL');
          }

          if (query.is_active !== undefined) {
            qb.andWhere('area.is_active = :is_active', {
              is_active: query.is_active,
            });
          }

          qb.orderBy('area.name', 'ASC');

          return qb.getMany();
        });

      const findById = (id: string) =>
        tryAsync('load area', () =>
          repo.findOne({
            where: { id },
            relations: ['location'],
          }),
        );

      const findByIdWithChildren = (id: string) =>
        tryAsync('load area with children', () =>
          repo.findOne({
            where: { id },
            relations: ['location', 'children'],
          }),
        );

      const findHierarchyByLocationId = (locationId: string) =>
        tryAsync('load area hierarchy', async () => {
          const rootAreas = await repo.find({
            where: {
              location_id: locationId,
              parent_id: IsNull(),
            },
            order: { name: 'ASC' },
          });

          for (const area of rootAreas) {
            await loadChildrenRecursively(area);
          }

          return rootAreas;
        });

      const update = (id: string, dto: UpdateAreaDto) =>
        tryAsync('update area', async () => {
          const area = await repo.findOne({
            where: { id },
            relations: ['location'],
          });
          if (!area) return null;

          Object.assign(area, dto);
          return repo.save(area);
        });

      const remove = (id: string) =>
        tryAsync('delete area', async () => {
          const result = await repo.delete(id);
          return (result.affected ?? 0) > 0;
        });

      const existsById = (id: string) =>
        tryAsync('check area existence', async () => {
          const count = await repo.count({ where: { id } });
          return count > 0;
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
