import { Context, Effect } from 'effect';
import { Repository } from 'typeorm';
import {
  applyQuerySpecs,
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type QuerySpec,
  type RepositoryPaginatedResult,
} from '../../../common/utils/query-spec.utils';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { Location } from '../../../routes/locations/entities/location.entity';
import type { LocationQueryDto, LocationSortField, SortOrder } from '../../../routes/locations/dto';

const locationFilterSpec: QuerySpec<Location, LocationQueryDto> = (
  queryBuilder,
  query,
) => {
  if (query.search) {
    queryBuilder.andWhere('location.name ILIKE :search', {
      search: `%${query.search}%`,
    });
  }

  if (query.type) {
    queryBuilder.andWhere('location.type = :type', { type: query.type });
  }

  if (query.is_active !== undefined) {
    queryBuilder.andWhere('location.is_active = :is_active', {
      is_active: query.is_active,
    });
  }
};

const locationSortSpec: QuerySpec<Location, LocationQueryDto> = (
  queryBuilder,
  query,
) => {
  const sortBy = query.sort_by ?? ('name' as LocationSortField);
  const sortOrder = query.sort_order ?? ('ASC' as SortOrder);
  queryBuilder.orderBy(`location.${sortBy}`, sortOrder);
};

export interface LocationsRepository {
  readonly findAllPaginated: (
    query: LocationQueryDto,
  ) => Promise<RepositoryPaginatedResult<Location>>;
  readonly findAll: () => Promise<Location[]>;
  readonly findById: (id: string) => Promise<Location | null>;
  readonly existsById: (id: string) => Promise<boolean>;
  readonly create: (data: Partial<Location>) => Promise<Location>;
  readonly update: (id: string, data: Partial<Location>) => Promise<number>;
  readonly delete: (id: string) => Promise<void>;
}

export const LocationsRepository = Context.GenericTag<LocationsRepository>(
  '@librestock/effect/LocationsRepository',
);

const createLocationsRepository = (
  repository: Repository<Location>,
): LocationsRepository => ({
  findAllPaginated: async (query) => {
    const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);
    const queryBuilder = applyQuerySpecs(
      repository.createQueryBuilder('location'),
      query,
      [locationFilterSpec, locationSortSpec],
    );

    const total = await queryBuilder.getCount();
    const data = await queryBuilder.skip(skip).take(limit).getMany();

    return toRepositoryPaginatedResult(data, total, page, limit);
  },
  findAll: () =>
    repository
      .createQueryBuilder('location')
      .orderBy('location.name', 'ASC')
      .getMany(),
  findById: (id) =>
    repository
      .createQueryBuilder('location')
      .where('location.id = :id', { id })
      .getOne(),
  existsById: async (id) => {
    const count = await repository
      .createQueryBuilder('location')
      .where('location.id = :id', { id })
      .getCount();
    return count > 0;
  },
  create: async (data) => {
    const location = repository.create(data);
    return repository.save(location);
  },
  update: async (id, data) => {
    const result = await repository
      .createQueryBuilder()
      .update(Location)
      .set(data)
      .where('id = :id', { id })
      .execute();
    return result.affected ?? 0;
  },
  delete: async (id) => {
    await repository.delete(id);
  },
});

export const makeLocationsRepository = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;

  return createLocationsRepository(dataSource.getRepository(Location));
});
