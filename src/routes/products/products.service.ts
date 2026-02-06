import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { Transactional } from '../../common/decorators/transactional.decorator';
import { ErrorType } from '../../common/dto/error-response.dto';
import {
  createEmptyBulkResult,
  addBulkSuccess,
  addBulkFailure,
  findDuplicates,
  partitionByExistence,
  addNotFoundFailures,
} from '../../common/utils';
import { Product } from './entities/product.entity';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  ProductResponseDto,
  PaginatedProductsResponseDto,
  BulkCreateProductsDto,
  BulkUpdateStatusDto,
  BulkDeleteDto,
  BulkRestoreDto,
  BulkOperationResultDto,
} from './dto';
import { ProductRepository } from './product.repository';
import { ProductBuilder } from './products.builder';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoriesService: CategoriesService,
  ) {}

  async findAllPaginated(
    query: ProductQueryDto,
  ): Promise<PaginatedProductsResponseDto> {
    const result = await this.productRepository.findAllPaginated(query);
    return ProductBuilder.toPaginatedResponse(result);
  }

  async findAll(): Promise<ProductResponseDto[]> {
    const products = await this.productRepository.findAll();
    return ProductBuilder.toResponseDtoList(products);
  }

  async findOne(
    id: string,
    includeDeleted = false,
  ): Promise<ProductResponseDto> {
    const product = await this.productRepository.findById(id, includeDeleted);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return ProductBuilder.toResponseDto(product);
  }

  async findByCategory(categoryId: string): Promise<ProductResponseDto[]> {
    await this.checkCategoryExistence(categoryId, ErrorType.NOT_FOUND);
    const products = await this.productRepository.findByCategoryId(categoryId);
    return ProductBuilder.toResponseDtoList(products);
  }

  async findByCategoryTree(categoryId: string): Promise<ProductResponseDto[]> {
    await this.checkCategoryExistence(categoryId, ErrorType.NOT_FOUND);

    const descendantIds =
      await this.categoriesService.findAllDescendantIds(categoryId);
    const categoryIds = [categoryId, ...descendantIds];

    const products =
      await this.productRepository.findByCategoryIds(categoryIds);
    return ProductBuilder.toResponseDtoList(products);
  }

  async create(
    createProductDto: CreateProductDto,
    userId?: string,
  ): Promise<ProductResponseDto> {
    await this.checkCategoryExistence(
      createProductDto.category_id,
      ErrorType.BAD_REQUEST,
    );

    const existingSku = await this.productRepository.findBySku(
      createProductDto.sku,
    );

    if (existingSku) {
      throw new BadRequestException('A product with this SKU already exists');
    }

    // Validate price >= cost
    if (
      createProductDto.standard_price &&
      createProductDto.standard_cost &&
      createProductDto.standard_price < createProductDto.standard_cost
    ) {
      throw new BadRequestException(
        'Standard price must be greater than or equal to standard cost',
      );
    }

    const entityData = ProductBuilder.toCreateEntity(createProductDto, userId);
    const product = await this.productRepository.create(entityData);

    // Fetch with relations
    const productWithRelations = await this.productRepository.findById(
      product.id,
    );
    return ProductBuilder.toResponseDto(productWithRelations!);
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

        const entityData = ProductBuilder.toCreateEntity(productDto, userId);
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

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    userId?: string,
  ): Promise<ProductResponseDto> {
    const product = await this.getProductOrFail(id);

    if (updateProductDto.category_id) {
      await this.checkCategoryExistence(
        updateProductDto.category_id,
        ErrorType.BAD_REQUEST,
      );
    }

    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingSku = await this.productRepository.findBySku(
        updateProductDto.sku,
      );

      if (existingSku) {
        throw new BadRequestException('A product with this SKU already exists');
      }
    }

    // Validate price >= cost (considering both existing and new values)
    const newCost = updateProductDto.standard_cost ?? product.standard_cost;
    const newPrice = updateProductDto.standard_price ?? product.standard_price;
    if (newCost && newPrice && newPrice < newCost) {
      throw new BadRequestException(
        'Standard price must be greater than or equal to standard cost',
      );
    }

    if (Object.keys(updateProductDto).length === 0) {
      return ProductBuilder.toResponseDto(product);
    }

    await this.productRepository.update(id, {
      ...updateProductDto,
      updated_by: userId ?? null,
    });

    // Fetch with relations
    const productWithRelations = await this.productRepository.findById(id);
    return ProductBuilder.toResponseDto(productWithRelations!);
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

  async delete(id: string, userId?: string, permanent = false): Promise<void> {
    await this.getProductOrFail(id);

    if (permanent) {
      await this.productRepository.hardDelete(id);
    } else {
      await this.productRepository.softDelete(id, userId);
    }
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

  async restore(id: string): Promise<ProductResponseDto> {
    const product = await this.productRepository.findById(id, true);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (!product.deleted_at) {
      throw new BadRequestException('Product is not deleted');
    }

    await this.productRepository.restore(id);

    const restored = await this.productRepository.findById(id);
    return ProductBuilder.toResponseDto(restored!);
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

  private async getProductOrFail(id: string): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private async checkCategoryExistence(
    categoryId: string,
    errorType: ErrorType,
  ): Promise<void> {
    const exists = await this.categoriesService.existsById(categoryId);

    if (!exists) {
      throw errorType === ErrorType.NOT_FOUND
        ? new NotFoundException('Category not found')
        : new BadRequestException('Category not found');
    }
  }
}
