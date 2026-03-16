import { Effect } from 'effect';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
} from '../../platform/query-spec.utils';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { Product } from './entities/product.entity';
import type { Schema } from 'effect';
import type { ProductQuerySchema } from './products.schema';
import { ProductsInfrastructureError } from './products.errors';

type ProductQueryDto = Schema.Schema.Type<typeof ProductQuerySchema>;

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new ProductsInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

export class ProductsRepository extends Effect.Service<ProductsRepository>()(
  '@librestock/effect/ProductsRepository',
  {
    effect: Effect.gen(function* () {
      const dataSource = yield* TypeOrmDataSource;
      const repository = dataSource.getRepository(Product);

      const findAllPaginated = (query: ProductQueryDto) =>
        tryAsync('list products paginated', async () => {
          const { page, limit, skip } = resolvePaginationWindow(
            query.page,
            query.limit,
          );
          const qb = repository.createQueryBuilder('product');

          if (!query.include_deleted) {
            qb.where('product.deleted_at IS NULL');
          }

          if (query.search) {
            qb.andWhere(
              '(product.name ILIKE :search OR product.sku ILIKE :search)',
              {
                search: `%${query.search}%`,
              },
            );
          }
          if (query.category_id) {
            qb.andWhere('product.category_id = :category_id', {
              category_id: query.category_id,
            });
          }
          if (query.primary_supplier_id) {
            qb.andWhere('product.primary_supplier_id = :primary_supplier_id', {
              primary_supplier_id: query.primary_supplier_id,
            });
          }
          if (query.is_active !== undefined) {
            qb.andWhere('product.is_active = :is_active', {
              is_active: query.is_active,
            });
          }
          if (query.is_perishable !== undefined) {
            qb.andWhere('product.is_perishable = :is_perishable', {
              is_perishable: query.is_perishable,
            });
          }
          if (query.min_price !== undefined && query.max_price !== undefined) {
            qb.andWhere(
              'product.standard_price BETWEEN :min_price AND :max_price',
              {
                min_price: query.min_price,
                max_price: query.max_price,
              },
            );
          } else if (query.min_price !== undefined) {
            qb.andWhere('product.standard_price >= :min_price', {
              min_price: query.min_price,
            });
          } else if (query.max_price !== undefined) {
            qb.andWhere('product.standard_price <= :max_price', {
              max_price: query.max_price,
            });
          }

          qb.leftJoinAndSelect(
            'product.category',
            'category',
          ).leftJoinAndSelect('product.primary_supplier', 'supplier');

          qb.orderBy(`product.${query.sort_by}`, query.sort_order);

          const total = await qb.getCount();
          const data = await qb.skip(skip).take(limit).getMany();
          return toRepositoryPaginatedResult(data, total, page, limit);
        });

      const findAll = (includeDeleted = false) =>
        tryAsync('list all products', async () => {
          const qb = repository
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.primary_supplier', 'supplier')
            .orderBy('product.name', 'ASC');
          if (!includeDeleted) {
            qb.where('product.deleted_at IS NULL');
          }
          return qb.getMany();
        });

      const findById = (id: string, includeDeleted = false) =>
        tryAsync('find product by id', async () => {
          const qb = repository
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.primary_supplier', 'supplier')
            .where('product.id = :id', { id });
          if (!includeDeleted) {
            qb.andWhere('product.deleted_at IS NULL');
          }
          return qb.getOne();
        });

      const findBySku = (sku: string, includeDeleted = false) =>
        tryAsync('find product by sku', async () => {
          const qb = repository
            .createQueryBuilder('product')
            .where('product.sku = :sku', { sku });
          if (!includeDeleted) {
            qb.andWhere('product.deleted_at IS NULL');
          }
          return qb.getOne();
        });

      const findByCategoryId = (categoryId: string) =>
        tryAsync('find products by category', async () => {
          return repository
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.primary_supplier', 'supplier')
            .where('product.category_id = :categoryId', { categoryId })
            .andWhere('product.deleted_at IS NULL')
            .orderBy('product.name', 'ASC')
            .getMany();
        });

      const findByCategoryIds = (categoryIds: string[]) =>
        tryAsync('find products by categories', async () => {
          return repository
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.primary_supplier', 'supplier')
            .where('product.category_id IN (:...categoryIds)', { categoryIds })
            .andWhere('product.deleted_at IS NULL')
            .orderBy('product.name', 'ASC')
            .getMany();
        });

      const findByIds = (ids: string[], includeDeleted = false) =>
        tryAsync('find products by ids', async () => {
          const qb = repository
            .createQueryBuilder('product')
            .where('product.id IN (:...ids)', { ids });
          if (!includeDeleted) {
            qb.andWhere('product.deleted_at IS NULL');
          }
          return qb.getMany();
        });

      const findDeletedByIds = (ids: string[]) =>
        tryAsync('find deleted products by ids', async () => {
          return repository
            .createQueryBuilder('product')
            .where('product.id IN (:...ids)', { ids })
            .andWhere('product.deleted_at IS NOT NULL')
            .getMany();
        });

      const existsById = (id: string) =>
        tryAsync('check product existence', async () => {
          const count = await repository
            .createQueryBuilder('product')
            .where('product.id = :id', { id })
            .andWhere('product.deleted_at IS NULL')
            .getCount();
          return count > 0;
        });

      const create = (data: Partial<Product>) =>
        tryAsync('create product', async () => {
          const product = repository.create(data);
          return repository.save(product);
        });

      const update = (id: string, data: Partial<Product>) =>
        tryAsync('update product', async () => {
          const result = await repository
            .createQueryBuilder()
            .update(Product)
            .set(data)
            .where('id = :id', { id })
            .andWhere('deleted_at IS NULL')
            .execute();
          return result.affected ?? 0;
        });

      const updateMany = (ids: string[], data: Partial<Product>) =>
        tryAsync('update multiple products', async () => {
          const result = await repository
            .createQueryBuilder()
            .update(Product)
            .set(data)
            .where('id IN (:...ids)', { ids })
            .andWhere('deleted_at IS NULL')
            .execute();
          return result.affected ?? 0;
        });

      const softDelete = (id: string, deletedBy?: string) =>
        tryAsync('soft delete product', async () => {
          await repository
            .createQueryBuilder()
            .update(Product)
            .set({ deleted_at: new Date(), deleted_by: deletedBy ?? null })
            .where('id = :id', { id })
            .andWhere('deleted_at IS NULL')
            .execute();
        });

      const softDeleteMany = (ids: string[], deletedBy?: string) =>
        tryAsync('soft delete multiple products', async () => {
          const result = await repository
            .createQueryBuilder()
            .update(Product)
            .set({ deleted_at: new Date(), deleted_by: deletedBy ?? null })
            .where('id IN (:...ids)', { ids })
            .andWhere('deleted_at IS NULL')
            .execute();
          return result.affected ?? 0;
        });

      const restore = (id: string) =>
        tryAsync('restore product', async () => {
          await repository
            .createQueryBuilder()
            .update(Product)
            .set({ deleted_at: null, deleted_by: null })
            .where('id = :id', { id })
            .andWhere('deleted_at IS NOT NULL')
            .execute();
        });

      const restoreMany = (ids: string[]) =>
        tryAsync('restore multiple products', async () => {
          const result = await repository
            .createQueryBuilder()
            .update(Product)
            .set({ deleted_at: null, deleted_by: null })
            .where('id IN (:...ids)', { ids })
            .andWhere('deleted_at IS NOT NULL')
            .execute();
          return result.affected ?? 0;
        });

      const hardDelete = (id: string) =>
        tryAsync('hard delete product', async () => {
          await repository.delete(id);
        });

      const hardDeleteMany = (ids: string[]) =>
        tryAsync('hard delete multiple products', async () => {
          const result = await repository.delete(ids);
          return result.affected ?? 0;
        });

      return {
        findAllPaginated,
        findAll,
        findById,
        findBySku,
        findByCategoryId,
        findByCategoryIds,
        findByIds,
        findDeletedByIds,
        existsById,
        create,
        update,
        updateMany,
        softDelete,
        softDeleteMany,
        restore,
        restoreMany,
        hardDelete,
        hardDeleteMany,
      };
    }),
  },
) {}
