import { Effect } from 'effect';
import {
  applyQuerySpecs,
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type QuerySpec,
} from '../../platform/query-spec.utils';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { Location } from './entities/location.entity';
import { LocationsInfrastructureError } from './locations.errors';
import type { LocationQueryDto, LocationSortField } from '@librestock/types/locations';
import type { SortOrder } from '@librestock/types/common';

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

export class LocationsRepository extends Effect.Service<LocationsRepository>()(
  '@librestock/effect/LocationsRepository',
  {
    effect: Effect.gen(function* () {
      const dataSource = yield* TypeOrmDataSource;
      const repo = dataSource.getRepository(Location);

      const findAllPaginated = (query: LocationQueryDto) =>
        tryAsync('list locations', async () => {
          const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);
          const queryBuilder = applyQuerySpecs(
            repo.createQueryBuilder('location'),
            query,
            [locationFilterSpec, locationSortSpec],
          );

          const total = await queryBuilder.getCount();
          const data = await queryBuilder.skip(skip).take(limit).getMany();

          return toRepositoryPaginatedResult(data, total, page, limit);
        });

      const findAll = () =>
        tryAsync('list all locations', () =>
          repo
            .createQueryBuilder('location')
            .orderBy('location.name', 'ASC')
            .getMany(),
        );

      const findById = (id: string) =>
        tryAsync('load location', () =>
          repo
            .createQueryBuilder('location')
            .where('location.id = :id', { id })
            .getOne(),
        );

      const existsById = (id: string) =>
        tryAsync('check location existence', async () => {
          const count = await repo
            .createQueryBuilder('location')
            .where('location.id = :id', { id })
            .getCount();
          return count > 0;
        });

      const create = (data: Partial<Location>) =>
        tryAsync('create location', async () => {
          const location = repo.create(data);
          return repo.save(location);
        });

      const update = (id: string, data: Partial<Location>) =>
        tryAsync('update location', async () => {
          const result = await repo
            .createQueryBuilder()
            .update(Location)
            .set(data)
            .where('id = :id', { id })
            .execute();
          return result.affected ?? 0;
        });

      const remove = (id: string) =>
        tryAsync('delete location', async () => {
          await repo.delete(id);
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
