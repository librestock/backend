import { Context, Effect } from 'effect';
import { Repository } from 'typeorm';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type RepositoryPaginatedResult,
} from '../../../common/utils/query-spec.utils';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { Product } from '../../../routes/products/entities/product.entity';
import type { Schema } from 'effect';
import type { ProductQuerySchema } from '../../../routes/products/products.schema';

type ProductQueryDto = Schema.Schema.Type<typeof ProductQuerySchema>;

export interface ProductsRepository {
  readonly findAllPaginated: (query: ProductQueryDto) => Promise<RepositoryPaginatedResult<Product>>;
  readonly findAll: (includeDeleted?: boolean) => Promise<Product[]>;
  readonly findById: (id: string, includeDeleted?: boolean) => Promise<Product | null>;
  readonly findBySku: (sku: string, includeDeleted?: boolean) => Promise<Product | null>;
  readonly findByCategoryId: (categoryId: string) => Promise<Product[]>;
  readonly findByCategoryIds: (categoryIds: string[]) => Promise<Product[]>;
  readonly findByIds: (ids: string[], includeDeleted?: boolean) => Promise<Product[]>;
  readonly findDeletedByIds: (ids: string[]) => Promise<Product[]>;
  readonly existsById: (id: string) => Promise<boolean>;
  readonly create: (data: Partial<Product>) => Promise<Product>;
  readonly update: (id: string, data: Partial<Product>) => Promise<number>;
  readonly updateMany: (ids: string[], data: Partial<Product>) => Promise<number>;
  readonly softDelete: (id: string, deletedBy?: string) => Promise<void>;
  readonly softDeleteMany: (ids: string[], deletedBy?: string) => Promise<number>;
  readonly restore: (id: string) => Promise<void>;
  readonly restoreMany: (ids: string[]) => Promise<number>;
  readonly hardDelete: (id: string) => Promise<void>;
  readonly hardDeleteMany: (ids: string[]) => Promise<number>;
}

export const ProductsRepository = Context.GenericTag<ProductsRepository>(
  '@librestock/effect/ProductsRepository',
);

const createProductsRepository = (
  repository: Repository<Product>,
): ProductsRepository => ({
  findAllPaginated: async (query) => {
    const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);
    const qb = repository.createQueryBuilder('product');

    if (!query.include_deleted) {
      qb.where('product.deleted_at IS NULL');
    }

    if (query.search) {
      qb.andWhere('(product.name ILIKE :search OR product.sku ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.category_id) {
      qb.andWhere('product.category_id = :category_id', { category_id: query.category_id });
    }
    if (query.primary_supplier_id) {
      qb.andWhere('product.primary_supplier_id = :primary_supplier_id', {
        primary_supplier_id: query.primary_supplier_id,
      });
    }
    if (query.is_active !== undefined) {
      qb.andWhere('product.is_active = :is_active', { is_active: query.is_active });
    }
    if (query.is_perishable !== undefined) {
      qb.andWhere('product.is_perishable = :is_perishable', { is_perishable: query.is_perishable });
    }
    if (query.min_price !== undefined && query.max_price !== undefined) {
      qb.andWhere('product.standard_price BETWEEN :min_price AND :max_price', {
        min_price: query.min_price,
        max_price: query.max_price,
      });
    } else if (query.min_price !== undefined) {
      qb.andWhere('product.standard_price >= :min_price', { min_price: query.min_price });
    } else if (query.max_price !== undefined) {
      qb.andWhere('product.standard_price <= :max_price', { max_price: query.max_price });
    }

    qb.leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.primary_supplier', 'supplier');

    qb.orderBy(`product.${query.sort_by}`, query.sort_order);

    const total = await qb.getCount();
    const data = await qb.skip(skip).take(limit).getMany();
    return toRepositoryPaginatedResult(data, total, page, limit);
  },
  findAll: async (includeDeleted = false) => {
    const qb = repository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.primary_supplier', 'supplier')
      .orderBy('product.name', 'ASC');
    if (!includeDeleted) {
      qb.where('product.deleted_at IS NULL');
    }
    return qb.getMany();
  },
  findById: async (id, includeDeleted = false) => {
    const qb = repository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.primary_supplier', 'supplier')
      .where('product.id = :id', { id });
    if (!includeDeleted) {
      qb.andWhere('product.deleted_at IS NULL');
    }
    return qb.getOne();
  },
  findBySku: async (sku, includeDeleted = false) => {
    const qb = repository.createQueryBuilder('product')
      .where('product.sku = :sku', { sku });
    if (!includeDeleted) {
      qb.andWhere('product.deleted_at IS NULL');
    }
    return qb.getOne();
  },
  findByCategoryId: async (categoryId) => {
    return repository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.primary_supplier', 'supplier')
      .where('product.category_id = :categoryId', { categoryId })
      .andWhere('product.deleted_at IS NULL')
      .orderBy('product.name', 'ASC')
      .getMany();
  },
  findByCategoryIds: async (categoryIds) => {
    return repository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.primary_supplier', 'supplier')
      .where('product.category_id IN (:...categoryIds)', { categoryIds })
      .andWhere('product.deleted_at IS NULL')
      .orderBy('product.name', 'ASC')
      .getMany();
  },
  findByIds: async (ids, includeDeleted = false) => {
    const qb = repository.createQueryBuilder('product')
      .where('product.id IN (:...ids)', { ids });
    if (!includeDeleted) {
      qb.andWhere('product.deleted_at IS NULL');
    }
    return qb.getMany();
  },
  findDeletedByIds: async (ids) => {
    return repository.createQueryBuilder('product')
      .where('product.id IN (:...ids)', { ids })
      .andWhere('product.deleted_at IS NOT NULL')
      .getMany();
  },
  existsById: async (id) => {
    const count = await repository.createQueryBuilder('product')
      .where('product.id = :id', { id })
      .andWhere('product.deleted_at IS NULL')
      .getCount();
    return count > 0;
  },
  create: async (data) => {
    const product = repository.create(data);
    return repository.save(product);
  },
  update: async (id, data) => {
    const result = await repository.createQueryBuilder()
      .update(Product).set(data)
      .where('id = :id', { id })
      .andWhere('deleted_at IS NULL')
      .execute();
    return result.affected ?? 0;
  },
  updateMany: async (ids, data) => {
    const result = await repository.createQueryBuilder()
      .update(Product).set(data)
      .where('id IN (:...ids)', { ids })
      .andWhere('deleted_at IS NULL')
      .execute();
    return result.affected ?? 0;
  },
  softDelete: async (id, deletedBy) => {
    await repository.createQueryBuilder()
      .update(Product)
      .set({ deleted_at: new Date(), deleted_by: deletedBy ?? null })
      .where('id = :id', { id })
      .andWhere('deleted_at IS NULL')
      .execute();
  },
  softDeleteMany: async (ids, deletedBy) => {
    const result = await repository.createQueryBuilder()
      .update(Product)
      .set({ deleted_at: new Date(), deleted_by: deletedBy ?? null })
      .where('id IN (:...ids)', { ids })
      .andWhere('deleted_at IS NULL')
      .execute();
    return result.affected ?? 0;
  },
  restore: async (id) => {
    await repository.createQueryBuilder()
      .update(Product)
      .set({ deleted_at: null, deleted_by: null })
      .where('id = :id', { id })
      .andWhere('deleted_at IS NOT NULL')
      .execute();
  },
  restoreMany: async (ids) => {
    const result = await repository.createQueryBuilder()
      .update(Product)
      .set({ deleted_at: null, deleted_by: null })
      .where('id IN (:...ids)', { ids })
      .andWhere('deleted_at IS NOT NULL')
      .execute();
    return result.affected ?? 0;
  },
  hardDelete: async (id) => {
    await repository.delete(id);
  },
  hardDeleteMany: async (ids) => {
    const result = await repository.delete(ids);
    return result.affected ?? 0;
  },
});

export const makeProductsRepository = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;
  return createProductsRepository(dataSource.getRepository(Product));
});
