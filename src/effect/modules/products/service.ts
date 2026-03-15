import { Context, Effect } from 'effect';
import type { Schema } from 'effect';
import type {
  ProductQuerySchema,
  CreateProductSchema,
  UpdateProductSchema,
  BulkCreateProductsSchema,
  BulkUpdateStatusSchema,
  BulkDeleteSchema,
  BulkRestoreSchema,
} from './products.schema';
import type { ProductResponseDto } from '@librestock/types/products';
import type { Product } from './entities/product.entity';
import { toPaginatedResponse } from '../../platform/pagination.utils';
import {
  addBulkFailure,
  addBulkSuccess,
  addNotFoundFailures,
  createEmptyBulkResult,
  findDuplicates,
  partitionByExistence,
  type BulkOperationResult,
} from '../../platform/bulk-operation.utils';
import {
  productTryAsync,
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
import { CategoriesService } from '../categories/service';

type ProductQueryDto = Schema.Schema.Type<typeof ProductQuerySchema>;
type CreateProductDto = Schema.Schema.Type<typeof CreateProductSchema>;
type UpdateProductDto = Schema.Schema.Type<typeof UpdateProductSchema>;
type BulkCreateProductsDto = Schema.Schema.Type<
  typeof BulkCreateProductsSchema
>;
type BulkUpdateStatusDto = Schema.Schema.Type<typeof BulkUpdateStatusSchema>;
type BulkDeleteDto = Schema.Schema.Type<typeof BulkDeleteSchema>;
type BulkRestoreDto = Schema.Schema.Type<typeof BulkRestoreSchema>;

export interface ProductsService {
  readonly findAllPaginated: (
    query: ProductQueryDto,
  ) => Effect.Effect<
    { data: ProductResponseDto[]; meta: any },
    ProductsInfrastructureError
  >;
  readonly findAll: () => Effect.Effect<
    ProductResponseDto[],
    ProductsInfrastructureError
  >;
  readonly findOne: (
    id: string,
    includeDeleted?: boolean,
  ) => Effect.Effect<
    ProductResponseDto,
    ProductNotFound | ProductsInfrastructureError
  >;
  readonly findByCategory: (
    categoryId: string,
  ) => Effect.Effect<
    ProductResponseDto[],
    CategoryNotFound | ProductsInfrastructureError
  >;
  readonly findByCategoryTree: (
    categoryId: string,
  ) => Effect.Effect<
    ProductResponseDto[],
    CategoryNotFound | ProductsInfrastructureError
  >;
  readonly create: (
    dto: CreateProductDto,
    userId?: string,
  ) => Effect.Effect<
    ProductResponseDto,
    | CategoryNotFound
    | PriceBelowCost
    | ProductsInfrastructureError
    | SkuAlreadyExists
  >;
  readonly bulkCreate: (
    bulkDto: BulkCreateProductsDto,
    userId?: string,
  ) => Promise<BulkOperationResult>;
  readonly update: (
    id: string,
    dto: UpdateProductDto,
    userId?: string,
  ) => Effect.Effect<
    ProductResponseDto,
    | CategoryNotFound
    | PriceBelowCost
    | ProductNotFound
    | ProductsInfrastructureError
    | SkuAlreadyExists
  >;
  readonly bulkUpdateStatus: (
    bulkDto: BulkUpdateStatusDto,
    userId?: string,
  ) => Promise<BulkOperationResult>;
  readonly delete: (
    id: string,
    userId?: string,
    permanent?: boolean,
  ) => Effect.Effect<void, ProductNotFound | ProductsInfrastructureError>;
  readonly bulkDelete: (
    bulkDto: BulkDeleteDto,
    userId?: string,
  ) => Promise<BulkOperationResult>;
  readonly restore: (
    id: string,
  ) => Effect.Effect<
    ProductResponseDto,
    ProductNotDeleted | ProductNotFound | ProductsInfrastructureError
  >;
  readonly bulkRestore: (
    bulkDto: BulkRestoreDto,
  ) => Promise<BulkOperationResult>;
  readonly existsById: (id: string) => Promise<boolean>;
}

export const ProductsService = Context.GenericTag<ProductsService>(
  '@librestock/effect/ProductsService',
);

export const makeProductsService = Effect.gen(function* () {
  const repository = yield* ProductsRepository;
  const categoriesService = yield* CategoriesService;

  const getProductOrFail = (
    id: string,
    includeDeleted = false,
  ): Effect.Effect<Product, ProductNotFound | ProductsInfrastructureError> =>
    Effect.flatMap(
      productTryAsync('load product', () =>
        repository.findById(id, includeDeleted),
      ),
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

  const checkCategoryExists = (
    categoryId: string,
  ): Effect.Effect<void, CategoryNotFound | ProductsInfrastructureError> =>
    Effect.flatMap(
      productTryAsync('check category existence', () =>
        categoriesService.existsById(categoryId),
      ),
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
      productTryAsync('check sku existence', () => repository.findBySku(sku)),
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

  return {
    findAllPaginated: (query) =>
      Effect.map(
        productTryAsync('list products', () =>
          repository.findAllPaginated(query),
        ),
        (result) => toPaginatedResponse(result, toProductResponseDto),
      ),
    findAll: () =>
      Effect.map(
        productTryAsync('list all products', () => repository.findAll()),
        toProductResponseDtoList,
      ),
    findOne: (id, includeDeleted = false) =>
      Effect.map(getProductOrFail(id, includeDeleted), toProductResponseDto),
    findByCategory: (categoryId) =>
      Effect.gen(function* () {
        yield* checkCategoryExists(categoryId);
        const products = yield* productTryAsync(
          'list products by category',
          () => repository.findByCategoryId(categoryId),
        );
        return toProductResponseDtoList(products);
      }),
    findByCategoryTree: (categoryId) =>
      Effect.gen(function* () {
        yield* checkCategoryExists(categoryId);
        const descendantIds = yield* productTryAsync(
          'load category descendant ids',
          () => categoriesService.findAllDescendantIds(categoryId),
        );
        const categoryIds = [categoryId, ...descendantIds];
        const products = yield* productTryAsync(
          'list products by category tree',
          () => repository.findByCategoryIds(categoryIds),
        );
        return toProductResponseDtoList(products);
      }),
    create: (dto, userId) =>
      Effect.gen(function* () {
        yield* checkCategoryExists(dto.category_id);
        yield* ensureSkuAvailable(dto.sku);
        yield* validatePriceNotBelowCost(dto.standard_price, dto.standard_cost);

        const entityData = toCreateProductEntity(dto, userId);
        const product = yield* productTryAsync('create product', () =>
          repository.create(entityData),
        );
        const productWithRelations = yield* Effect.flatMap(
          productTryAsync('load created product', () =>
            repository.findById(product.id),
          ),
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
      }),
    bulkCreate: async (bulkDto, userId) => {
      const result = createEmptyBulkResult();

      // Validate all categories exist first
      const categoryIds = [
        ...new Set(bulkDto.products.map((p) => p.category_id)),
      ];
      for (const categoryId of categoryIds) {
        const exists = await categoriesService.existsById(categoryId);
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

      // Check for duplicate SKUs in request
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

      // Process each product
      for (const productDto of bulkDto.products) {
        if (duplicateSkus.includes(productDto.sku)) continue;

        try {
          const existingSku = await repository.findBySku(productDto.sku);
          if (existingSku) {
            addBulkFailure(result, 'A product with this SKU already exists', {
              sku: productDto.sku,
            });
            continue;
          }

          const entityData = toCreateProductEntity(productDto, userId);
          const product = await repository.create(entityData);
          addBulkSuccess(result, product.id);
        } catch (error) {
          addBulkFailure(
            result,
            error instanceof Error ? error.message : 'Unknown error',
            { sku: productDto.sku },
          );
        }
      }

      return result;
    },
    update: (id, dto, userId) =>
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

        yield* productTryAsync('update product', () =>
          repository.update(id, { ...dto, updated_by: userId ?? null }),
        );

        const updated = yield* getProductOrFail(id);
        return toProductResponseDto(updated);
      }),
    bulkUpdateStatus: async (bulkDto, userId) => {
      const result = createEmptyBulkResult();

      const ids = [...bulkDto.ids];
      const existingProducts = await repository.findByIds(ids);
      const existingIds = new Set(existingProducts.map((p) => p.id));
      const { existing: idsToUpdate, notFound } = partitionByExistence(
        ids,
        existingIds,
      );

      addNotFoundFailures(result, notFound, 'Product');

      if (idsToUpdate.length > 0) {
        const affectedCount = await repository.updateMany(idsToUpdate, {
          is_active: bulkDto.is_active,
          updated_by: userId ?? null,
        });
        result.success_count = affectedCount;
        result.succeeded = idsToUpdate.slice(0, affectedCount);
      }

      return result;
    },
    delete: (id, userId, permanent = false) =>
      Effect.gen(function* () {
        yield* getProductOrFail(id);
        if (permanent) {
          yield* productTryAsync('hard delete product', () =>
            repository.hardDelete(id),
          );
        } else {
          yield* productTryAsync('soft delete product', () =>
            repository.softDelete(id, userId),
          );
        }
      }),
    bulkDelete: async (bulkDto, userId) => {
      const result = createEmptyBulkResult();

      const ids = [...bulkDto.ids];
      const existingProducts = await repository.findByIds(ids);
      const existingIds = new Set(existingProducts.map((p) => p.id));
      const { existing: idsToDelete, notFound } = partitionByExistence(
        ids,
        existingIds,
      );

      addNotFoundFailures(result, notFound, 'Product');

      if (idsToDelete.length > 0) {
        const affectedCount = bulkDto.permanent
          ? await repository.hardDeleteMany(idsToDelete)
          : await repository.softDeleteMany(idsToDelete, userId);
        result.success_count = affectedCount;
        result.succeeded = idsToDelete.slice(0, affectedCount);
      }

      return result;
    },
    restore: (id) =>
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

        yield* productTryAsync('restore product', () => repository.restore(id));

        const restored = yield* getProductOrFail(id);
        return toProductResponseDto(restored);
      }),
    bulkRestore: async (bulkDto) => {
      const result = createEmptyBulkResult();

      const ids = [...bulkDto.ids];
      const deletedProducts = await repository.findDeletedByIds(ids);
      const deletedIds = new Set(deletedProducts.map((p) => p.id));
      const { existing: idsToRestore, notFound } = partitionByExistence(
        ids,
        deletedIds,
      );

      for (const id of notFound) {
        addBulkFailure(result, 'Product not found or not deleted', { id });
      }

      if (idsToRestore.length > 0) {
        const affectedCount = await repository.restoreMany(idsToRestore);
        result.success_count = affectedCount;
        result.succeeded = idsToRestore.slice(0, affectedCount);
      }

      return result;
    },
    existsById: async (id) => {
      const product = await repository.findById(id);
      return product !== null;
    },
  } satisfies ProductsService;
});
