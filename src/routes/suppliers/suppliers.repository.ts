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
import { Supplier } from './entities/supplier.entity';
import { SupplierQueryDto } from './dto';

export type PaginatedResult<T> = RepositoryPaginatedResult<T>;

const supplierFilterSpec: QuerySpec<Supplier, SupplierQueryDto> = (
  queryBuilder,
  query,
) => {
  if (query.q) {
    queryBuilder.andWhere('supplier.name ILIKE :search', {
      search: `%${query.q}%`,
    });
  }

  if (query.is_active !== undefined) {
    queryBuilder.andWhere('supplier.is_active = :is_active', {
      is_active: query.is_active,
    });
  }
};

const supplierSortSpec: QuerySpec<Supplier, SupplierQueryDto> = (
  queryBuilder,
) => {
  queryBuilder.orderBy('supplier.name', 'ASC');
};

@Injectable()
export class SupplierRepository {
  constructor(
    @InjectRepository(Supplier)
    private readonly repository: Repository<Supplier>,
  ) {}

  async findAllPaginated(
    query: SupplierQueryDto,
  ): Promise<PaginatedResult<Supplier>> {
    const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);

    const queryBuilder = applyQuerySpecs(
      this.repository.createQueryBuilder('supplier'),
      query,
      [supplierFilterSpec, supplierSortSpec],
    );

    const total = await queryBuilder.getCount();

    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    return toRepositoryPaginatedResult(data, total, page, limit);
  }

  async findById(id: string): Promise<Supplier | null> {
    return this.repository
      .createQueryBuilder('supplier')
      .where('supplier.id = :id', { id })
      .getOne();
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('supplier')
      .where('supplier.id = :id', { id })
      .getCount();
    return count > 0;
  }

  async create(createData: Partial<Supplier>): Promise<Supplier> {
    const supplier = this.repository.create(createData);
    return this.repository.save(supplier);
  }

  async update(id: string, updateData: Partial<Supplier>): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Supplier)
      .set(updateData)
      .where('id = :id', { id })
      .execute();
    return result.affected ?? 0;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
