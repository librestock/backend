import { Injectable } from '@nestjs/common';
import { Effect } from 'effect';
import { Transactional } from '../../common/decorators/transactional.decorator';
import {
  addBulkFailure,
  addBulkSuccess,
  addNotFoundFailures,
  createEmptyBulkResult,
  findDuplicates,
  partitionByExistence,
  toPaginatedResponse,
} from '../../common/utils';
import { CategoriesService } from '../categories/categories.service';
import {
  BulkCreateProductsDto,
  BulkDeleteDto,
  BulkOperationResultDto,
  BulkRestoreDto,
  BulkUpdateStatusDto,
  CreateProductDto,
  PaginatedProductsResponseDto,
  ProductQueryDto,
  ProductResponseDto,
  UpdateProductDto,
} from './dto';
import { Product } from './entities/product.entity';
import { ProductRepository } from './product.repository';
import {
  productTryAsync,
  toCreateProductEntity,
  toProductResponseDto,
  toProductResponseDtoList,
} from './products.utils';
import {
  CategoryNotFound,
  PriceBelowCost,
  ProductNotFound,
  ProductNotDeleted,
  ProductsInfrastructureError,
  SkuAlreadyExists,
} from './products.errors';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoriesService: CategoriesService,
  ) {}

  findAllPaginated(
    query: ProductQueryDto,
  ): Effect.Effect<PaginatedProductsResponseDto, ProductsInfrastructureError> {
    return Effect.map(
      productTryAsync('list products', () =>
        this.productRepository.findAllPaginated(query),
      ),
      (result) => toPaginatedResponse(result, toProductResponseDto),
    );
  }

  findAll(): Effect.Effect<ProductResponseDto[], ProductsInfrastructureError> {
    return Effect.map(
      productTryAsync('list all products', () => this.productRepository.findAll()),
      toProductResponseDtoList,
    );
  }

  findOne(
    id: string,
    includeDeleted = false,
  ): Effect.Effect<
    ProductResponseDto,
    ProductNotFound | ProductsInfrastructureError
  > {
    return Effect.map(this.getProductOrFail(id, includeDeleted), toProductResponseDto);
  }

  findByCategory(
    categoryId: string,
  ): Effect.Effect<
    ProductResponseDto[],
    CategoryNotFound | ProductsInfrastructureError
  > {
    return Effect.gen(this, function* () {
      yield* this.checkCategoryExists(categoryId);
      const products = yield* productTryAsync('list products by category', () =>
        this.productRepository.findByCategoryId(categoryId),
      );
      return toProductResponseDtoList(products);
    });
  }

  findByCategoryTree(
    categoryId: string,
  ): Effect.Effect<
    ProductResponseDto[],
    CategoryNotFound | ProductsInfrastructureError
  > {
    return Effect.gen(this, function* () {
      yield* this.checkCategoryExists(categoryId);

      const descendantIds = yield* productTryAsync(
        'load category descendant ids',
        () => this.categoriesService.findAllDescendantIds(categoryId),
      );
      const categoryIds = [categoryId, ...descendantIds];

      const products = yield* productTryAsync(
        'list products by category tree',
        () => this.productRepository.findByCategoryIds(categoryIds),
      );
      return toProductResponseDtoList(products);
    });
  }

  create(
    createProductDto: CreateProductDto,
    userId?: string,
  ): Effect.Effect<
    ProductResponseDto,
    | CategoryNotFound
    | PriceBelowCost
    | ProductsInfrastructureError
    | SkuAlreadyExists
  > {
    return Effect.gen(this, function* () {
      yield* this.checkCategoryExists(createProductDto.category_id);
      yield* this.ensureSkuAvailable(createProductDto.sku);
      yield* this.validatePriceNotBelowCost(
        createProductDto.standard_price,
        createProductDto.standard_cost,
      );

      const entityData = toCreateProductEntity(createProductDto, userId);
      const product = yield* productTryAsync('create product', () =>
        this.productRepository.create(entityData),
      );
      const productWithRelations = yield* Effect.flatMap(
        productTryAsync('load created product', () =>
          this.productRepository.findById(product.id),
        ),
        (createdProduct) =>
          createdProduct
            ? Effect.succeed(createdProduct)
            : Effect.fail(
                new ProductsInfrastructureError({
                  action: 'load created product',
                  message: 'Products service failed to load created product',
                }),
              ),
      );
      return toProductResponseDto(productWithRelations);
    });
  }

  @Transactional()
  async bulkCreate(
    bulkDto: BulkCreateProductsDto,
    userId?: string,
  ): Promise<BulkOperationResultDto> {
    const result = createEmptyBulkResult();

    // Validate all categories exist first
    const categoryIds = [
      ...new Set(bulkDto.products.map((p) => p.category_id)),
    ];
    for (const categoryId of categoryIds) {
      const exists = await this.categoriesService.existsById(categoryId);
      if (!exists) {
        // Fail all products if any category is missing
        for (const product of bulkDto.products) {
          addBulkFailure(result, `Category ${categoryId} not found`, {
            sku: product.sku,
          });
        }
        return result;
      }
    }

    // Check for duplicate SKUs in request
    const skusInRequest = bulkDto.products.map((p) => p.sku);
    const duplicateSkus = findDuplicates(skusInRequest);

    // Mark duplicates as failures
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
      if (duplicateSkus.includes(productDto.sku)) {
        continue; // Already handled above
      }

      try {
        const existingSku = await this.productRepository.findBySku(
          productDto.sku,
        );
        if (existingSku) {
          addBulkFailure(result, 'A product with this SKU already exists', {
            sku: productDto.sku,
          });
          continue;
        }

        const entityData = toCreateProductEntity(productDto, userId);
        const product = await this.productRepository.create(entityData);
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
  }

  update(
    id: string,
    updateProductDto: UpdateProductDto,
    userId?: string,
  ): Effect.Effect<
    ProductResponseDto,
    | CategoryNotFound
    | PriceBelowCost
    | ProductNotFound
    | ProductsInfrastructureError
    | SkuAlreadyExists
  > {
    return Effect.gen(this, function* () {
      const product = yield* this.getProductOrFail(id);

      if (updateProductDto.category_id) {
        yield* this.checkCategoryExists(updateProductDto.category_id);
      }

      if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
        yield* this.ensureSkuAvailable(updateProductDto.sku);
      }

      yield* this.validatePriceNotBelowCost(
        updateProductDto.standard_price ?? product.standard_price,
        updateProductDto.standard_cost ?? product.standard_cost,
      );

      if (Object.keys(updateProductDto).length === 0) {
        return toProductResponseDto(product);
      }

      yield* productTryAsync('update product', () =>
        this.productRepository.update(id, {
          ...updateProductDto,
          updated_by: userId ?? null,
        }),
      );

      const productWithRelations = yield* this.getProductOrFail(id);
      return toProductResponseDto(productWithRelations);
    });
  }

  async bulkUpdateStatus(
    bulkDto: BulkUpdateStatusDto,
    userId?: string,
  ): Promise<BulkOperationResultDto> {
    const result = createEmptyBulkResult();

    // Find existing products
    const existingProducts = await this.productRepository.findByIds(
      bulkDto.ids,
    );
    const existingIds = new Set(existingProducts.map((p) => p.id));

    // Partition IDs into existing and not found
    const { existing: idsToUpdate, notFound } = partitionByExistence(
      bulkDto.ids,
      existingIds,
    );

    // Add not found failures
    addNotFoundFailures(result, notFound, 'Product');

    // Update existing products
    if (idsToUpdate.length > 0) {
      const affectedCount = await this.productRepository.updateMany(
        idsToUpdate,
        {
          is_active: bulkDto.is_active,
          updated_by: userId ?? null,
        },
      );
      result.success_count = affectedCount;
      result.succeeded = idsToUpdate.slice(0, affectedCount);
    }

    return result;
  }

  public delete(
    id: string,
    userId?: string,
    permanent = false,
  ): Effect.Effect<void, ProductNotFound | ProductsInfrastructureError> {
    return Effect.gen(this, function* () {
      yield* this.getProductOrFail(id);
      if (permanent) {
        yield* productTryAsync('hard delete product', () =>
          this.productRepository.hardDelete(id),
        );
      } else {
        yield* productTryAsync('soft delete product', () =>
          this.productRepository.softDelete(id, userId),
        );
      }
    });
  }

  async bulkDelete(
    bulkDto: BulkDeleteDto,
    userId?: string,
  ): Promise<BulkOperationResultDto> {
    const result = createEmptyBulkResult();

    // Find existing products
    const existingProducts = await this.productRepository.findByIds(
      bulkDto.ids,
    );
    const existingIds = new Set(existingProducts.map((p) => p.id));

    // Partition IDs into existing and not found
    const { existing: idsToDelete, notFound } = partitionByExistence(
      bulkDto.ids,
      existingIds,
    );

    // Add not found failures
    addNotFoundFailures(result, notFound, 'Product');

    // Delete existing products
    if (idsToDelete.length > 0) {
      const affectedCount = bulkDto.permanent
        ? await this.productRepository.hardDeleteMany(idsToDelete)
        : await this.productRepository.softDeleteMany(idsToDelete, userId);

      result.success_count = affectedCount;
      result.succeeded = idsToDelete.slice(0, affectedCount);
    }

    return result;
  }

  restore(
    id: string,
  ): Effect.Effect<
    ProductResponseDto,
    ProductNotDeleted | ProductNotFound | ProductsInfrastructureError
  > {
    return Effect.gen(this, function* () {
      const product = yield* this.getProductOrFail(id, true);
      if (!product.deleted_at) {
        return yield* Effect.fail(
          new ProductNotDeleted({
            productId: id,
            message: 'Product is not deleted',
          }),
        );
      }

      yield* productTryAsync('restore product', () =>
        this.productRepository.restore(id),
      );

      const restored = yield* this.getProductOrFail(id);
      return toProductResponseDto(restored);
    });
  }

  async bulkRestore(bulkDto: BulkRestoreDto): Promise<BulkOperationResultDto> {
    const result = createEmptyBulkResult();

    // Find deleted products
    const deletedProducts = await this.productRepository.findDeletedByIds(
      bulkDto.ids,
    );
    const deletedIds = new Set(deletedProducts.map((p) => p.id));

    // Partition IDs into restorable and not found/not deleted
    const { existing: idsToRestore, notFound } = partitionByExistence(
      bulkDto.ids,
      deletedIds,
    );

    // Add failures for not found or not deleted products
    for (const id of notFound) {
      addBulkFailure(result, 'Product not found or not deleted', { id });
    }

    // Restore deleted products
    if (idsToRestore.length > 0) {
      const affectedCount =
        await this.productRepository.restoreMany(idsToRestore);
      result.success_count = affectedCount;
      result.succeeded = idsToRestore.slice(0, affectedCount);
    }

    return result;
  }

  async existsById(id: string): Promise<boolean> {
    const product = await this.productRepository.findById(id);
    return product !== null;
  }

  private getProductOrFail(
    id: string,
    includeDeleted = false,
  ): Effect.Effect<Product, ProductNotFound | ProductsInfrastructureError> {
    return Effect.flatMap(
      productTryAsync('load product', () =>
        this.productRepository.findById(id, includeDeleted),
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
  }

  private checkCategoryExists(
    categoryId: string,
  ): Effect.Effect<void, CategoryNotFound | ProductsInfrastructureError> {
    return Effect.flatMap(
      productTryAsync('check category existence', () =>
        this.categoriesService.existsById(categoryId),
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
  }

  private ensureSkuAvailable(
    sku: string,
  ): Effect.Effect<void, ProductsInfrastructureError | SkuAlreadyExists> {
    return Effect.flatMap(
      productTryAsync('check sku existence', () => this.productRepository.findBySku(sku)),
      (existingSku) =>
        existingSku
          ? Effect.fail(
              new SkuAlreadyExists({
                sku,
                message: 'A product with this SKU already exists',
              }),
            )
          : Effect.void,
    );
  }

  private validatePriceNotBelowCost(
    standardPrice: number | null | undefined,
    standardCost: number | null | undefined,
  ): Effect.Effect<void, PriceBelowCost> {
    if (
      standardPrice != null &&
      standardCost != null &&
      standardPrice < standardCost
    ) {
      return Effect.fail(
        new PriceBelowCost({
          standardPrice,
          standardCost,
          message: 'Standard price must be greater than or equal to standard cost',
        }),
      );
    }

    return Effect.void;
  }
}
