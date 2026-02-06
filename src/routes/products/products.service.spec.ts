import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { type Category } from '../categories/entities/category.entity';
import { ProductsService } from './products.service';
import { ProductRepository, type PaginatedResult } from './product.repository';
import { type Product } from './entities/product.entity';
import { ProductSortField, SortOrder } from './dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: jest.Mocked<ProductRepository>;
  let categoriesService: jest.Mocked<CategoriesService>;

  const mockCategory: Category = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Electronics',
    parent_id: null,
    description: 'Electronic products',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    parent: null,
    children: [],
  };

  const mockProduct: Product = {
    id: '660e8400-e29b-41d4-a716-446655440000',
    sku: 'PROD-001',
    name: 'Test Product',
    description: 'A test product',
    category_id: mockCategory.id,
    brand_id: null,
    volume_ml: null,
    weight_kg: null,
    dimensions_cm: null,
    standard_cost: 100,
    standard_price: 150,
    markup_percentage: 50,
    reorder_point: 10,
    primary_supplier_id: null,
    supplier_sku: null,
    barcode: null,
    unit: null,
    is_active: true,
    is_perishable: false,
    notes: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    deleted_at: null,
    created_by: 'user_123',
    updated_by: 'user_123',
    deleted_by: null,
    category: mockCategory,
    primary_supplier: null,
  };

  beforeEach(async () => {
    const mockProductRepository = {
      findAllPaginated: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      findByCategoryId: jest.fn(),
      findByCategoryIds: jest.fn(),
      findByIds: jest.fn(),
      findDeletedByIds: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      softDelete: jest.fn(),
      softDeleteMany: jest.fn(),
      restore: jest.fn(),
      restoreMany: jest.fn(),
      hardDelete: jest.fn(),
      hardDeleteMany: jest.fn(),
    };

    const mockCategoriesService = {
      findAll: jest.fn(),
      existsById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAllDescendantIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: ProductRepository,
          useValue: mockProductRepository,
        },
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepository = module.get(ProductRepository);
    categoriesService = module.get(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPaginated', () => {
    it('should return paginated products', async () => {
      const paginatedResult: PaginatedResult<Product> = {
        data: [mockProduct],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      };
      productRepository.findAllPaginated.mockResolvedValue(paginatedResult);

      const result = await service.findAllPaginated({
        page: 1,
        limit: 20,
        sort_by: ProductSortField.NAME,
        sort_order: SortOrder.ASC,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.has_next).toBe(false);
      expect(result.meta.has_previous).toBe(false);
    });

    it('should handle pagination metadata correctly', async () => {
      const paginatedResult: PaginatedResult<Product> = {
        data: [mockProduct],
        total: 50,
        page: 2,
        limit: 20,
        total_pages: 3,
      };
      productRepository.findAllPaginated.mockResolvedValue(paginatedResult);

      const result = await service.findAllPaginated({
        page: 2,
        limit: 20,
        sort_by: ProductSortField.NAME,
        sort_order: SortOrder.ASC,
      });

      expect(result.meta.has_next).toBe(true);
      expect(result.meta.has_previous).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return all products', async () => {
      productRepository.findAll.mockResolvedValue([mockProduct]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].sku).toBe('PROD-001');
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      productRepository.findById.mockResolvedValue(mockProduct);

      const result = await service.findOne(mockProduct.id);

      expect(result.id).toBe(mockProduct.id);
      expect(result.sku).toBe('PROD-001');
    });

    it('should throw NotFoundException when product does not exist', async () => {
      productRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include deleted products when includeDeleted is true', async () => {
      const deletedProduct = { ...mockProduct, deleted_at: new Date() };
      productRepository.findById.mockResolvedValue(deletedProduct);

      const result = await service.findOne(mockProduct.id, true);

      expect(productRepository.findById).toHaveBeenCalledWith(
        mockProduct.id,
        true,
      );
      expect(result).toBeDefined();
    });
  });

  describe('findByCategory', () => {
    it('should return products by category', async () => {
      categoriesService.existsById.mockResolvedValue(true);
      productRepository.findByCategoryId.mockResolvedValue([mockProduct]);

      const result = await service.findByCategory(mockCategory.id);

      expect(result).toHaveLength(1);
      expect(result[0].category_id).toBe(mockCategory.id);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      categoriesService.existsById.mockResolvedValue(false);

      await expect(service.findByCategory('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCategoryTree', () => {
    it('should return products from category and descendants', async () => {
      const childCategoryId = '550e8400-e29b-41d4-a716-446655440001';
      categoriesService.existsById.mockResolvedValue(true);
      categoriesService.findAllDescendantIds.mockResolvedValue([
        childCategoryId,
      ]);
      productRepository.findByCategoryIds.mockResolvedValue([mockProduct]);

      const result = await service.findByCategoryTree(mockCategory.id);

      expect(productRepository.findByCategoryIds).toHaveBeenCalledWith([
        mockCategory.id,
        childCategoryId,
      ]);
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    const createDto = {
      sku: 'PROD-001',
      name: 'Test Product',
      category_id: mockCategory.id,
      reorder_point: 10,
      is_active: true,
      is_perishable: false,
    };

    it('should create a product successfully', async () => {
      categoriesService.existsById.mockResolvedValue(true);
      productRepository.findBySku.mockResolvedValue(null);
      productRepository.create.mockResolvedValue(mockProduct);
      productRepository.findById.mockResolvedValue(mockProduct);

      const result = await service.create(createDto, 'user_123');

      expect(categoriesService.existsById).toHaveBeenCalledWith(
        mockCategory.id,
      );
      expect(productRepository.create).toHaveBeenCalled();
      expect(result.sku).toBe('PROD-001');
    });

    it('should throw BadRequestException when category does not exist', async () => {
      categoriesService.existsById.mockResolvedValue(false);

      await expect(service.create(createDto, 'user_123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when SKU already exists', async () => {
      categoriesService.existsById.mockResolvedValue(true);
      productRepository.findBySku.mockResolvedValue(mockProduct);

      await expect(service.create(createDto, 'user_123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto, 'user_123')).rejects.toThrow(
        'A product with this SKU already exists',
      );
    });

    it('should throw BadRequestException when price is less than cost', async () => {
      const dtoWithInvalidPrice = {
        ...createDto,
        standard_cost: 100,
        standard_price: 50,
      };
      categoriesService.existsById.mockResolvedValue(true);
      productRepository.findBySku.mockResolvedValue(null);

      await expect(
        service.create(dtoWithInvalidPrice, 'user_123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(dtoWithInvalidPrice, 'user_123'),
      ).rejects.toThrow(
        'Standard price must be greater than or equal to standard cost',
      );
    });

    it('should allow equal price and cost', async () => {
      const dtoWithEqualPriceAndCost = {
        ...createDto,
        standard_cost: 100,
        standard_price: 100,
      };
      categoriesService.existsById.mockResolvedValue(true);
      productRepository.findBySku.mockResolvedValue(null);
      productRepository.create.mockResolvedValue(mockProduct);
      productRepository.findById.mockResolvedValue(mockProduct);

      await expect(
        service.create(dtoWithEqualPriceAndCost, 'user_123'),
      ).resolves.toBeDefined();
    });
  });

  describe('bulkCreate', () => {
    const bulkDto = {
      products: [
        {
          sku: 'PROD-001',
          name: 'Product 1',
          category_id: mockCategory.id,
          reorder_point: 10,
          is_active: true,
          is_perishable: false,
        },
        {
          sku: 'PROD-002',
          name: 'Product 2',
          category_id: mockCategory.id,
          reorder_point: 5,
          is_active: true,
          is_perishable: false,
        },
      ],
    };

    it('should create multiple products successfully', async () => {
      categoriesService.existsById.mockResolvedValue(true);
      productRepository.findBySku.mockResolvedValue(null);
      productRepository.create
        .mockResolvedValueOnce({ ...mockProduct, id: 'id-1' })
        .mockResolvedValueOnce({ ...mockProduct, id: 'id-2', sku: 'PROD-002' });

      const result = await service.bulkCreate(bulkDto, 'user_123');

      expect(result.success_count).toBe(2);
      expect(result.failure_count).toBe(0);
      expect(result.succeeded).toHaveLength(2);
    });

    it('should fail all if category does not exist', async () => {
      categoriesService.existsById.mockResolvedValue(false);

      const result = await service.bulkCreate(bulkDto, 'user_123');

      expect(result.success_count).toBe(0);
      expect(result.failure_count).toBe(2);
      expect(result.failures).toHaveLength(2);
    });

    it('should handle duplicate SKUs in request', async () => {
      const bulkDtoWithDuplicates = {
        products: [
          { ...bulkDto.products[0], sku: 'DUPLICATE' },
          { ...bulkDto.products[1], sku: 'DUPLICATE' },
        ],
      };
      categoriesService.existsById.mockResolvedValue(true);

      const result = await service.bulkCreate(
        bulkDtoWithDuplicates,
        'user_123',
      );

      expect(
        result.failures.some((f) => f.error === 'Duplicate SKU in request'),
      ).toBe(true);
    });

    it('should handle partial failures', async () => {
      categoriesService.existsById.mockResolvedValue(true);
      productRepository.findBySku
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(null);
      productRepository.create.mockResolvedValue({
        ...mockProduct,
        id: 'new-id',
        sku: 'PROD-002',
      });

      const result = await service.bulkCreate(bulkDto, 'user_123');

      expect(result.success_count).toBe(1);
      expect(result.failure_count).toBe(1);
    });
  });

  describe('update', () => {
    it('should update product successfully', async () => {
      const updateDto = { name: 'Updated Product' };
      const updatedProduct = { ...mockProduct, name: 'Updated Product' };
      productRepository.findById
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(updatedProduct);
      productRepository.update.mockResolvedValue(1);

      const result = await service.update(
        mockProduct.id,
        updateDto,
        'user_123',
      );

      expect(productRepository.update).toHaveBeenCalled();
      expect(result.name).toBe('Updated Product');
    });

    it('should throw NotFoundException when product does not exist', async () => {
      productRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { name: 'Test' }, 'user_123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate category exists when updating category_id', async () => {
      const updateDto = { category_id: 'new-category-id' };
      productRepository.findById.mockResolvedValue(mockProduct);
      categoriesService.existsById.mockResolvedValue(false);

      await expect(
        service.update(mockProduct.id, updateDto, 'user_123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate SKU uniqueness when updating SKU', async () => {
      const updateDto = { sku: 'EXISTING-SKU' };
      productRepository.findById.mockResolvedValue(mockProduct);
      productRepository.findBySku.mockResolvedValue({
        ...mockProduct,
        id: 'different-id',
        sku: 'EXISTING-SKU',
      });

      await expect(
        service.update(mockProduct.id, updateDto, 'user_123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(mockProduct.id, updateDto, 'user_123'),
      ).rejects.toThrow('A product with this SKU already exists');
    });

    it('should allow updating to same SKU', async () => {
      const updateDto = { sku: mockProduct.sku };
      productRepository.findById.mockResolvedValue(mockProduct);
      productRepository.update.mockResolvedValue(1);

      await expect(
        service.update(mockProduct.id, updateDto, 'user_123'),
      ).resolves.toBeDefined();
    });

    it('should validate price >= cost considering existing values', async () => {
      const updateDto = { standard_price: 50 };
      productRepository.findById.mockResolvedValue({
        ...mockProduct,
        standard_cost: 100,
      });

      await expect(
        service.update(mockProduct.id, updateDto, 'user_123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing product when no changes provided', async () => {
      productRepository.findById.mockResolvedValue(mockProduct);

      const result = await service.update(mockProduct.id, {}, 'user_123');

      expect(productRepository.update).not.toHaveBeenCalled();
      expect(result.id).toBe(mockProduct.id);
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should update status for multiple products', async () => {
      const bulkDto = { ids: ['id-1', 'id-2'], is_active: false };
      productRepository.findByIds.mockResolvedValue([
        { ...mockProduct, id: 'id-1' },
        { ...mockProduct, id: 'id-2' },
      ]);
      productRepository.updateMany.mockResolvedValue(2);

      const result = await service.bulkUpdateStatus(bulkDto, 'user_123');

      expect(result.success_count).toBe(2);
      expect(result.failure_count).toBe(0);
    });

    it('should handle non-existent products', async () => {
      const bulkDto = { ids: ['id-1', 'non-existent'], is_active: false };
      productRepository.findByIds.mockResolvedValue([
        { ...mockProduct, id: 'id-1' },
      ]);
      productRepository.updateMany.mockResolvedValue(1);

      const result = await service.bulkUpdateStatus(bulkDto, 'user_123');

      expect(result.success_count).toBe(1);
      expect(result.failure_count).toBe(1);
      expect(result.failures[0].id).toBe('non-existent');
    });
  });

  describe('delete', () => {
    it('should soft delete product by default', async () => {
      productRepository.findById.mockResolvedValue(mockProduct);
      productRepository.softDelete.mockResolvedValue(undefined);

      await service.delete(mockProduct.id, 'user_123');

      expect(productRepository.softDelete).toHaveBeenCalledWith(
        mockProduct.id,
        'user_123',
      );
      expect(productRepository.hardDelete).not.toHaveBeenCalled();
    });

    it('should hard delete when permanent is true', async () => {
      productRepository.findById.mockResolvedValue(mockProduct);
      productRepository.hardDelete.mockResolvedValue(undefined);

      await service.delete(mockProduct.id, 'user_123', true);

      expect(productRepository.hardDelete).toHaveBeenCalledWith(mockProduct.id);
      expect(productRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when product does not exist', async () => {
      productRepository.findById.mockResolvedValue(null);

      await expect(
        service.delete('non-existent-id', 'user_123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkDelete', () => {
    it('should soft delete multiple products', async () => {
      const bulkDto = { ids: ['id-1', 'id-2'] };
      productRepository.findByIds.mockResolvedValue([
        { ...mockProduct, id: 'id-1' },
        { ...mockProduct, id: 'id-2' },
      ]);
      productRepository.softDeleteMany.mockResolvedValue(2);

      const result = await service.bulkDelete(bulkDto, 'user_123');

      expect(result.success_count).toBe(2);
      expect(productRepository.softDeleteMany).toHaveBeenCalledWith(
        ['id-1', 'id-2'],
        'user_123',
      );
    });

    it('should hard delete when permanent is true', async () => {
      const bulkDto = { ids: ['id-1', 'id-2'], permanent: true };
      productRepository.findByIds.mockResolvedValue([
        { ...mockProduct, id: 'id-1' },
        { ...mockProduct, id: 'id-2' },
      ]);
      productRepository.hardDeleteMany.mockResolvedValue(2);

      const result = await service.bulkDelete(bulkDto, 'user_123');

      expect(result.success_count).toBe(2);
      expect(productRepository.hardDeleteMany).toHaveBeenCalledWith([
        'id-1',
        'id-2',
      ]);
    });

    it('should handle non-existent products', async () => {
      const bulkDto = { ids: ['id-1', 'non-existent'] };
      productRepository.findByIds.mockResolvedValue([
        { ...mockProduct, id: 'id-1' },
      ]);
      productRepository.softDeleteMany.mockResolvedValue(1);

      const result = await service.bulkDelete(bulkDto, 'user_123');

      expect(result.success_count).toBe(1);
      expect(result.failure_count).toBe(1);
    });
  });

  describe('restore', () => {
    it('should restore soft-deleted product', async () => {
      const deletedProduct = { ...mockProduct, deleted_at: new Date() };
      productRepository.findById
        .mockResolvedValueOnce(deletedProduct)
        .mockResolvedValueOnce({ ...mockProduct, deleted_at: null });
      productRepository.restore.mockResolvedValue(undefined);

      const result = await service.restore(mockProduct.id);

      expect(productRepository.restore).toHaveBeenCalledWith(mockProduct.id);
      expect(result.deleted_at).toBeNull();
    });

    it('should throw NotFoundException when product does not exist', async () => {
      productRepository.findById.mockResolvedValue(null);

      await expect(service.restore('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when product is not deleted', async () => {
      productRepository.findById.mockResolvedValue(mockProduct);

      await expect(service.restore(mockProduct.id)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.restore(mockProduct.id)).rejects.toThrow(
        'Product is not deleted',
      );
    });
  });

  describe('bulkRestore', () => {
    it('should restore multiple deleted products', async () => {
      const bulkDto = { ids: ['id-1', 'id-2'] };
      const deletedProducts = [
        { ...mockProduct, id: 'id-1', deleted_at: new Date() },
        { ...mockProduct, id: 'id-2', deleted_at: new Date() },
      ];
      productRepository.findDeletedByIds.mockResolvedValue(deletedProducts);
      productRepository.restoreMany.mockResolvedValue(2);

      const result = await service.bulkRestore(bulkDto);

      expect(result.success_count).toBe(2);
      expect(result.failure_count).toBe(0);
    });

    it('should handle products that are not deleted', async () => {
      const bulkDto = { ids: ['id-1', 'not-deleted'] };
      productRepository.findDeletedByIds.mockResolvedValue([
        { ...mockProduct, id: 'id-1', deleted_at: new Date() },
      ]);
      productRepository.restoreMany.mockResolvedValue(1);

      const result = await service.bulkRestore(bulkDto);

      expect(result.success_count).toBe(1);
      expect(result.failure_count).toBe(1);
      expect(result.failures[0].error).toBe('Product not found or not deleted');
    });
  });
});
