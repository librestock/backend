import { Context, Effect } from 'effect';
import { IsNull, Repository } from 'typeorm';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { Area } from '../../../routes/areas/entities/area.entity';
import type { CreateAreaDto } from '../../../routes/areas/dto/create-area.dto';
import type { UpdateAreaDto } from '../../../routes/areas/dto/update-area.dto';
import type { AreaQueryDto } from '../../../routes/areas/dto/area-query.dto';

export interface AreasRepository {
  readonly create: (dto: CreateAreaDto) => Promise<Area>;
  readonly findAll: (query: AreaQueryDto) => Promise<Area[]>;
  readonly findById: (id: string) => Promise<Area | null>;
  readonly findByIdWithChildren: (id: string) => Promise<Area | null>;
  readonly findHierarchyByLocationId: (locationId: string) => Promise<Area[]>;
  readonly update: (id: string, dto: UpdateAreaDto) => Promise<Area | null>;
  readonly delete: (id: string) => Promise<boolean>;
  readonly existsById: (id: string) => Promise<boolean>;
}

export const AreasRepository = Context.GenericTag<AreasRepository>(
  '@librestock/effect/AreasRepository',
);

const createAreasRepository = (
  repository: Repository<Area>,
): AreasRepository => {
  const loadChildrenRecursively = async (area: Area): Promise<void> => {
    const children = await repository.find({
      where: { parent_id: area.id },
      order: { name: 'ASC' },
    });

    area.children = children;

    for (const child of children) {
      await loadChildrenRecursively(child);
    }
  };

  return {
    create: async (dto) => {
      const area = repository.create({
        ...dto,
        parent_id: dto.parent_id ?? null,
        code: dto.code ?? '',
        description: dto.description ?? '',
        is_active: dto.is_active ?? true,
      });
      return repository.save(area);
    },
    findAll: async (query) => {
      const qb = repository.createQueryBuilder('area');

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
    },
    findById: (id) =>
      repository.findOne({
        where: { id },
        relations: ['location'],
      }),
    findByIdWithChildren: (id) =>
      repository.findOne({
        where: { id },
        relations: ['location', 'children'],
      }),
    findHierarchyByLocationId: async (locationId) => {
      const rootAreas = await repository.find({
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
    },
    update: async (id, dto) => {
      const area = await repository.findOne({
        where: { id },
        relations: ['location'],
      });
      if (!area) return null;

      Object.assign(area, dto);
      return repository.save(area);
    },
    delete: async (id) => {
      const result = await repository.delete(id);
      return (result.affected ?? 0) > 0;
    },
    existsById: async (id) => {
      const count = await repository.count({ where: { id } });
      return count > 0;
    },
  };
};

export const makeAreasRepository = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;

  return createAreasRepository(dataSource.getRepository(Area));
});
