import { Effect } from 'effect';
import type { Schema } from 'effect';
import { toPaginatedResponse } from '../../platform/pagination.utils';
import {
  addBulkFailure,
  addBulkSuccess,
  addNotFoundFailures,
  createEmptyBulkResult,
  findDuplicates,
  partitionByExistence,
} from '../../platform/bulk-operation.utils';
import { CategoriesService } from '../categories/service';
import type { products } from '../../platform/db/schema';
import type {
  ProductQuerySchema,
  CreateProductSchema,
  UpdateProductSchema,
  BulkCreateProductsSchema,
  BulkUpdateStatusSchema,
  BulkDeleteSchema,
  BulkRestoreSchema,
} from './products.schema';
import {
  toCreateProductEntity,
  toProductResponseDto,
  toProductResponseDtoList,
} from './products.utils';
import {
  CategoryNotFound,
  PriceBelowCost,
  ProductNotDeleted,
  ProductNotFound,
  ProductsInfrastructureError,
  SkuAlreadyExists,
} from './products.errors';
import { ProductsRepository } from './repository';

type ProductRow = typeof products.$inferSelect;
type Product = ProductRow & {
  category?: { id: string; name: string; parent_id: string | null } | null;
  primary_supplier?: { id: string; name: string } | null;
};

type ProductQueryDto = Schema.Schema.Type<typeof ProductQuerySchema>;
type CreateProductDto = Schema.Schema.Type<typeof CreateProductSchema>;
type UpdateProductDto = Schema.Schema.Type<typeof UpdateProductSchema>;
type BulkCreateProductsDto = Schema.Schema.Type<
  typeof BulkCreateProductsSchema
>;
type BulkUpdateStatusDto = Schema.Schema.Type<typeof BulkUpdateStatusSchema>;
type BulkDeleteDto = Schema.Schema.Type<typeof BulkDeleteSchema>;
type BulkRestoreDto = Schema.Schema.Type<typeof BulkRestoreSchema>;

export class ProductsService extends Effect.Service<ProductsService>()(
  '@librestock/effect/ProductsService',
  {
    effect: Effect.gen(function* () {
      const repository = yield* ProductsRepository;
      const categoriesService = yield* CategoriesService;

      const getProductOrFail = (
        id: string,
        includeDeleted = false,
      ): Effect.Effect<Product, ProductNotFound | ProductsInfrastructureError> =>
        Effect.flatMap(
          repository.findById(id, includeDeleted),
          (product) =>
            product
              ? Effect.succeed(product)
              : Effect.fail(
                  new ProductNotFound({
                    productId: id,
                    message: 'Product not found',
                  }),
                ),
        );

      const checkCategoryExists = (categoryId: string) =>
        Effect.flatMap(
          categoriesService.existsById(categoryId),
          (exists) =>
            exists
              ? Effect.void
              : Effect.fail(
                  new CategoryNotFound({
                    categoryId,
                    message: 'Category not found',
                  }),
                ),
        );

      const ensureSkuAvailable = (
        sku: string,
      ): Effect.Effect<void, ProductsInfrastructureError | SkuAlreadyExists> =>
        Effect.flatMap(
          repository.findBySku(sku),
          (existing) =>
            existing
              ? Effect.fail(
                  new SkuAlreadyExists({
                    sku,
                    message: 'A product with this SKU already exists',
                  }),
                )
              : Effect.void,
        );

      const validatePriceNotBelowCost = (
        standardPrice: number | null | undefined,
        standardCost: number | null | undefined,
      ): Effect.Effect<void, PriceBelowCost> => {
        if (
          standardPrice != null &&
          standardCost != null &&
          standardPrice < standardCost
        ) {
          return Effect.fail(
            new PriceBelowCost({
              standardPrice,
              standardCost,
              message:
                'Standard price must be greater than or equal to standard cost',
            }),
          );
        }
        return Effect.void;
      };

      const findAllPaginated = (query: ProductQueryDto) =>
        Effect.map(
          repository.findAllPaginated(query),
          (result) => toPaginatedResponse(result, toProductResponseDto),
        );

      const findAll = () =>
        Effect.map(
          repository.findAll(),
          toProductResponseDtoList,
        );

      const findOne = (id: string, includeDeleted = false) =>
        Effect.map(getProductOrFail(id, includeDeleted), toProductResponseDto);

      const findByCategory = (categoryId: string) =>
        Effect.gen(function* () {
          yield* checkCategoryExists(categoryId);
          const products = yield* repository.findByCategoryId(categoryId);
          return toProductResponseDtoList(products);
        });

      const findByCategoryTree = (categoryId: string) =>
        Effect.gen(function* () {
          yield* checkCategoryExists(categoryId);
          const descendantIds = yield* categoriesService.findAllDescendantIds(categoryId);
          const categoryIds = [categoryId, ...descendantIds];
          const products = yield* repository.findByCategoryIds(categoryIds);
          return toProductResponseDtoList(products);
        });

      const create = (dto: CreateProductDto, userId?: string) =>
        Effect.gen(function* () {
          yield* checkCategoryExists(dto.category_id);
          yield* ensureSkuAvailable(dto.sku);
          yield* validatePriceNotBelowCost(dto.standard_price, dto.standard_cost);

          const entityData = toCreateProductEntity(dto, userId);
          const product = yield* repository.create(entityData);
          const productWithRelations = yield* Effect.flatMap(
            repository.findById(product.id),
            (p) =>
              p
                ? Effect.succeed(p)
                : Effect.fail(
                    new ProductsInfrastructureError({
                      action: 'load created product',
                      message: 'Products service failed to load created product',
                    }),
                  ),
          );
          return toProductResponseDto(productWithRelations);
        });

      const bulkCreate = (bulkDto: BulkCreateProductsDto, userId?: string) =>
        Effect.gen(function* () {
          const result = createEmptyBulkResult();

          const categoryIds = [
            ...new Set(bulkDto.products.map((p) => p.category_id)),
          ];
          for (const categoryId of categoryIds) {
            const exists = yield* categoriesService.existsById(categoryId);
            if (!exists) {
              for (const product of bulkDto.products) {
                if (product.category_id === categoryId) {
                  addBulkFailure(result, `Category ${categoryId} not found`, {
                    sku: product.sku,
                  });
                }
              }
              return result;
            }
          }

          const skusInRequest = bulkDto.products.map((p) => p.sku);
          const duplicateSkus = findDuplicates(skusInRequest);

          if (duplicateSkus.length > 0) {
            for (const product of bulkDto.products) {
              if (duplicateSkus.includes(product.sku)) {
                addBulkFailure(result, 'Duplicate SKU in request', {
                  sku: product.sku,
                });
              }
            }
          }

          for (const productDto of bulkDto.products) {
            if (duplicateSkus.includes(productDto.sku)) continue;

            const existingSku = yield* repository.findBySku(productDto.sku);
            if (existingSku) {
              addBulkFailure(result, 'A product with this SKU already exists', {
                sku: productDto.sku,
              });
              continue;
            }

            const entityData = toCreateProductEntity(productDto, userId);
            const product = yield* repository.create(entityData);
            addBulkSuccess(result, product.id);
          }

          return result;
        });

      const update = (id: string, dto: UpdateProductDto, userId?: string) =>
        Effect.gen(function* () {
          const product = yield* getProductOrFail(id);

          if (dto.category_id) {
            yield* checkCategoryExists(dto.category_id);
          }

          if (dto.sku && dto.sku !== product.sku) {
            yield* ensureSkuAvailable(dto.sku);
          }

          yield* validatePriceNotBelowCost(
            dto.standard_price ?? product.standard_price,
            dto.standard_cost ?? product.standard_cost,
          );

          if (Object.keys(dto).length === 0) {
            return toProductResponseDto(product);
          }

          yield* repository.update(id, { ...dto, updated_by: userId ?? null });

          const updated = yield* getProductOrFail(id);
          return toProductResponseDto(updated);
        });

      const bulkUpdateStatus = (bulkDto: BulkUpdateStatusDto, userId?: string) =>
        Effect.gen(function* () {
          const result = createEmptyBulkResult();

          const ids = [...bulkDto.ids];
          const existingProducts = yield* repository.findByIds(ids);
          const existingIds = new Set(existingProducts.map((p) => p.id));
          const { existing: idsToUpdate, notFound } = partitionByExistence(
            ids,
            existingIds,
          );

          addNotFoundFailures(result, notFound, 'Product');

          if (idsToUpdate.length > 0) {
            const affectedCount = yield* repository.updateMany(idsToUpdate, {
              is_active: bulkDto.is_active,
              updated_by: userId ?? null,
            });
            result.success_count = affectedCount;
            result.succeeded = idsToUpdate.slice(0, affectedCount);
          }

          return result;
        });

      const remove = (id: string, userId?: string, permanent = false) =>
        Effect.gen(function* () {
          yield* getProductOrFail(id);
          if (permanent) {
            yield* repository.hardDelete(id);
          } else {
            yield* repository.softDelete(id, userId);
          }
        });

      const bulkDelete = (bulkDto: BulkDeleteDto, userId?: string) =>
        Effect.gen(function* () {
          const result = createEmptyBulkResult();

          const ids = [...bulkDto.ids];
          const existingProducts = yield* repository.findByIds(ids);
          const existingIds = new Set(existingProducts.map((p) => p.id));
          const { existing: idsToDelete, notFound } = partitionByExistence(
            ids,
            existingIds,
          );

          addNotFoundFailures(result, notFound, 'Product');

          if (idsToDelete.length > 0) {
            const affectedCount = bulkDto.permanent
              ? yield* repository.hardDeleteMany(idsToDelete)
              : yield* repository.softDeleteMany(idsToDelete, userId);
            result.success_count = affectedCount;
            result.succeeded = idsToDelete.slice(0, affectedCount);
          }

          return result;
        });

      const restore = (id: string) =>
        Effect.gen(function* () {
          const product = yield* getProductOrFail(id, true);
          if (!product.deleted_at) {
            return yield* Effect.fail(
              new ProductNotDeleted({
                productId: id,
                message: 'Product is not deleted',
              }),
            );
          }

          yield* repository.restore(id);

          const restored = yield* getProductOrFail(id);
          return toProductResponseDto(restored);
        });

      const bulkRestore = (bulkDto: BulkRestoreDto) =>
        Effect.gen(function* () {
          const result = createEmptyBulkResult();

          const ids = [...bulkDto.ids];
          const deletedProducts = yield* repository.findDeletedByIds(ids);
          const deletedIds = new Set(deletedProducts.map((p) => p.id));
          const { existing: idsToRestore, notFound } = partitionByExistence(
            ids,
            deletedIds,
          );

          for (const id of notFound) {
            addBulkFailure(result, 'Product not found or not deleted', { id });
          }

          if (idsToRestore.length > 0) {
            const affectedCount = yield* repository.restoreMany(idsToRestore);
            result.success_count = affectedCount;
            result.succeeded = idsToRestore.slice(0, affectedCount);
          }

          return result;
        });

      const existsById = (id: string) =>
        Effect.map(repository.findById(id), (product) => product !== null);

      return {
        findAllPaginated,
        findAll,
        findOne,
        findByCategory,
        findByCategoryTree,
        create,
        bulkCreate,
        update,
        bulkUpdateStatus,
        delete: remove,
        bulkDelete,
        restore,
        bulkRestore,
        existsById,
      };
    }),
    dependencies: [ProductsRepository.Default, CategoriesService.Default],
  },
) {}
