import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  applyQuerySpecs,
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type QuerySpec,
  type RepositoryPaginatedResult,
} from '../../common/utils/query-spec.utils';
import { Location } from './entities/location.entity';
import { LocationQueryDto, LocationSortField, SortOrder } from './dto';

export type PaginatedResult<T> = RepositoryPaginatedResult<T>;

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
  const sortBy = query.sort_by ?? LocationSortField.NAME;
  const sortOrder = query.sort_order ?? SortOrder.ASC;
  queryBuilder.orderBy(`location.${sortBy}`, sortOrder);
};

@Injectable()
export class LocationRepository {
  constructor(
    @InjectRepository(Location)
    private readonly repository: Repository<Location>,
  ) {}

  async findAllPaginated(
    query: LocationQueryDto,
  ): Promise<PaginatedResult<Location>> {
    const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);

    const queryBuilder = applyQuerySpecs(
      this.repository.createQueryBuilder('location'),
      query,
      [locationFilterSpec, locationSortSpec],
    );

    const total = await queryBuilder.getCount();

    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    return toRepositoryPaginatedResult(data, total, page, limit);
  }

  async findAll(): Promise<Location[]> {
    return this.repository
      .createQueryBuilder('location')
      .orderBy('location.name', 'ASC')
      .getMany();
  }

  async findById(id: string): Promise<Location | null> {
    return this.repository
      .createQueryBuilder('location')
      .where('location.id = :id', { id })
      .getOne();
  }

  async findByIds(ids: string[]): Promise<Location[]> {
    if (ids.length === 0) return [];
    return this.repository
      .createQueryBuilder('location')
      .where('location.id IN (:...ids)', { ids })
      .getMany();
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('location')
      .where('location.id = :id', { id })
      .getCount();
    return count > 0;
  }

  async create(createData: Partial<Location>): Promise<Location> {
    const location = this.repository.create(createData);
    return this.repository.save(location);
  }

  async update(id: string, updateData: Partial<Location>): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Location)
      .set(updateData)
      .where('id = :id', { id })
      .execute();
    return result.affected ?? 0;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
