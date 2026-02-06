import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { LocationQueryDto, LocationSortField, SortOrder } from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

@Injectable()
export class LocationRepository {
  constructor(
    @InjectRepository(Location)
    private readonly repository: Repository<Location>,
  ) {}

  async findAllPaginated(
    query: LocationQueryDto,
  ): Promise<PaginatedResult<Location>> {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      is_active,
      sort_by = LocationSortField.NAME,
      sort_order = SortOrder.ASC,
    } = query;

    const skip = (page - 1) * limit;

    const queryBuilder = this.repository.createQueryBuilder('location');

    // Search filter
    if (search) {
      queryBuilder.andWhere('location.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    // Type filter
    if (type) {
      queryBuilder.andWhere('location.type = :type', { type });
    }

    // Active status filter
    if (is_active !== undefined) {
      queryBuilder.andWhere('location.is_active = :is_active', { is_active });
    }

    // Sorting
    const sortColumn = `location.${sort_by}`;
    queryBuilder.orderBy(sortColumn, sort_order);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    return {
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
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
