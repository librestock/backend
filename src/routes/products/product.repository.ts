import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedRepository } from '../../common/repositories/paginated.repository';
import {
  type QuerySpec,
  type RepositoryPaginatedResult,
} from '../../common/utils/query-spec.utils';
import { Product } from './entities/product.entity';
import { ProductQueryDto, ProductSortField, SortOrder } from './dto';

export type PaginatedResult<T> = RepositoryPaginatedResult<T>;

const productFilterSpec: QuerySpec<Product, ProductQueryDto> = (
  queryBuilder,
  query,
) => {
  if (!query.include_deleted) {
    queryBuilder.where('product.deleted_at IS NULL');
  }

  if (query.search) {
    queryBuilder.andWhere(
      '(product.name ILIKE :search OR product.sku ILIKE :search)',
      { search: `%${query.search}%` },
    );
  }

  if (query.category_id) {
    queryBuilder.andWhere('product.category_id = :category_id', {
      category_id: query.category_id,
    });
  }

  if (query.primary_supplier_id) {
    queryBuilder.andWhere(
      'product.primary_supplier_id = :primary_supplier_id',
      { primary_supplier_id: query.primary_supplier_id },
    );
  }

  if (query.is_active !== undefined) {
    queryBuilder.andWhere('product.is_active = :is_active', {
      is_active: query.is_active,
    });
  }

  if (query.is_perishable !== undefined) {
    queryBuilder.andWhere('product.is_perishable = :is_perishable', {
      is_perishable: query.is_perishable,
    });
  }

  if (query.min_price !== undefined && query.max_price !== undefined) {
    queryBuilder.andWhere(
      'product.standard_price BETWEEN :min_price AND :max_price',
      { min_price: query.min_price, max_price: query.max_price },
    );
  } else if (query.min_price !== undefined) {
    queryBuilder.andWhere('product.standard_price >= :min_price', {
      min_price: query.min_price,
    });
  } else if (query.max_price !== undefined) {
    queryBuilder.andWhere('product.standard_price <= :max_price', {
      max_price: query.max_price,
    });
  }
};

const productSortSpec: QuerySpec<Product, ProductQueryDto> = (
  queryBuilder,
  query,
) => {
  const sortBy = query.sort_by ?? ProductSortField.NAME;
  const sortOrder = query.sort_order ?? SortOrder.ASC;
  queryBuilder.orderBy(`product.${sortBy}`, sortOrder);
};

@Injectable()
export class ProductRepository extends PaginatedRepository<
  Product,
  ProductQueryDto
> {
  constructor(
    @InjectRepository(Product)
    repository: Repository<Product>,
  ) {
    super(repository);
  }

  protected createPaginatedQueryBuilder() {
    return this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.primary_supplier', 'supplier');
  }

  protected getPaginatedQuerySpecs(): readonly QuerySpec<
    Product,
    ProductQueryDto
  >[] {
    return [productFilterSpec, productSortSpec];
  }

  async findAllPaginated(
    query: ProductQueryDto,
  ): Promise<PaginatedResult<Product>> {
    return this.runPaginatedQuery(query);
  }

  async findAll(includeDeleted = false): Promise<Product[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.primary_supplier', 'supplier')
      .orderBy('product.name', 'ASC');

    if (!includeDeleted) {
      queryBuilder.where('product.deleted_at IS NULL');
    }

    return queryBuilder.getMany();
  }

  async findById(id: string, includeDeleted = false): Promise<Product | null> {
    const queryBuilder = this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.primary_supplier', 'supplier')
      .where('product.id = :id', { id });

    if (!includeDeleted) {
      queryBuilder.andWhere('product.deleted_at IS NULL');
    }

    return queryBuilder.getOne();
  }

  async findBySku(
    sku: string,
    includeDeleted = false,
  ): Promise<Product | null> {
    const queryBuilder = this.repository
      .createQueryBuilder('product')
      .where('product.sku = :sku', { sku });

    if (!includeDeleted) {
      queryBuilder.andWhere('product.deleted_at IS NULL');
    }

    return queryBuilder.getOne();
  }

  async findByCategoryId(
    categoryId: string,
    includeDeleted = false,
  ): Promise<Product[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.primary_supplier', 'supplier')
      .where(
        `product.category_id IN (
          WITH RECURSIVE category_tree AS (
            SELECT id FROM categories WHERE id = :categoryId
            UNION ALL
            SELECT c.id FROM categories c
            INNER JOIN category_tree ct ON c.parent_id = ct.id
          )
          SELECT id FROM category_tree
        )`,
        { categoryId },
      )
      .orderBy('product.name', 'ASC');

    if (!includeDeleted) {
      queryBuilder.andWhere('product.deleted_at IS NULL');
    }

    return queryBuilder.getMany();
  }

  async findByCategoryIds(
    categoryIds: string[],
    includeDeleted = false,
  ): Promise<Product[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.primary_supplier', 'supplier')
      .where('product.category_id IN (:...categoryIds)', { categoryIds })
      .orderBy('product.name', 'ASC');

    if (!includeDeleted) {
      queryBuilder.andWhere('product.deleted_at IS NULL');
    }

    return queryBuilder.getMany();
  }

  async findByIds(ids: string[], includeDeleted = false): Promise<Product[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('product')
      .where('product.id IN (:...ids)', { ids });

    if (!includeDeleted) {
      queryBuilder.andWhere('product.deleted_at IS NULL');
    }

    return queryBuilder.getMany();
  }

  async findDeletedByIds(ids: string[]): Promise<Product[]> {
    return this.repository
      .createQueryBuilder('product')
      .where('product.id IN (:...ids)', { ids })
      .andWhere('product.deleted_at IS NOT NULL')
      .getMany();
  }

  async create(createData: Partial<Product>): Promise<Product> {
    const product = this.repository.create(createData);
    return this.repository.save(product);
  }

  async createMany(createDataArray: Partial<Product>[]): Promise<Product[]> {
    const products = this.repository.create(createDataArray);
    return this.repository.save(products);
  }

  async update(id: string, updateData: Partial<Product>): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Product)
      .set(updateData)
      .where('id = :id', { id })
      .andWhere('deleted_at IS NULL')
      .execute();
    return result.affected ?? 0;
  }

  async updateMany(
    ids: string[],
    updateData: Partial<Product>,
  ): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Product)
      .set(updateData)
      .where('id IN (:...ids)', { ids })
      .andWhere('deleted_at IS NULL')
      .execute();
    return result.affected ?? 0;
  }

  async softDelete(id: string, deletedBy?: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Product)
      .set({
        deleted_at: new Date(),
        deleted_by: deletedBy ?? null,
      })
      .where('id = :id', { id })
      .andWhere('deleted_at IS NULL')
      .execute();
  }

  async softDeleteMany(ids: string[], deletedBy?: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Product)
      .set({
        deleted_at: new Date(),
        deleted_by: deletedBy ?? null,
      })
      .where('id IN (:...ids)', { ids })
      .andWhere('deleted_at IS NULL')
      .execute();
    return result.affected ?? 0;
  }

  async restore(id: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Product)
      .set({
        deleted_at: null,
        deleted_by: null,
      })
      .where('id = :id', { id })
      .andWhere('deleted_at IS NOT NULL')
      .execute();
  }

  async restoreMany(ids: string[]): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Product)
      .set({
        deleted_at: null,
        deleted_by: null,
      })
      .where('id IN (:...ids)', { ids })
      .andWhere('deleted_at IS NOT NULL')
      .execute();
    return result.affected ?? 0;
  }

  async hardDelete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async hardDeleteMany(ids: string[]): Promise<number> {
    const result = await this.repository.delete(ids);
    return result.affected ?? 0;
  }
}
