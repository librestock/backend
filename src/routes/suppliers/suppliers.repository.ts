import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { SupplierQueryDto } from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

@Injectable()
export class SupplierRepository {
  constructor(
    @InjectRepository(Supplier)
    private readonly repository: Repository<Supplier>,
  ) {}

  async findAllPaginated(
    query: SupplierQueryDto,
  ): Promise<PaginatedResult<Supplier>> {
    const { page = 1, limit = 20, q, is_active } = query;

    const skip = (page - 1) * limit;

    const queryBuilder = this.repository.createQueryBuilder('supplier');

    // Search filter
    if (q) {
      queryBuilder.andWhere('supplier.name ILIKE :search', {
        search: `%${q}%`,
      });
    }

    // Active status filter
    if (is_active !== undefined) {
      queryBuilder.andWhere('supplier.is_active = :is_active', { is_active });
    }

    // Default sort by name
    queryBuilder.orderBy('supplier.name', 'ASC');

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
