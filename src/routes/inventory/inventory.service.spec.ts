import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LocationType } from 'src/common/enums';
import { ProductsService } from '../products/products.service';
import { LocationsService } from '../locations/locations.service';
import { AreasService } from '../areas/areas.service';
import { InventoryService } from './inventory.service';
import { InventoryRepository, type PaginatedResult } from './inventory.repository';
import { type Inventory } from './entities/inventory.entity';

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepository: jest.Mocked<InventoryRepository>;
  let productsService: jest.Mocked<ProductsService>;
  let locationsService: jest.Mocked<LocationsService>;
  let areasService: jest.Mocked<AreasService>;

  const mockInventory: Inventory = {
    id: 'inventory-001',
    product_id: 'product-001',
    product: {
      id: 'product-001',
      sku: 'SKU-001',
      name: 'Test Product',
      description: 'A test product',
      category_id: 'cat-001',
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
      unit: 'pcs',
      is_active: true,
      is_perishable: false,
      notes: null,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      deleted_at: null,
      created_by: 'user_123',
      updated_by: 'user_123',
      deleted_by: null,
      category: null as any,
      primary_supplier: null,
    },
    location_id: 'location-001',
    location: {
      id: 'location-001',
      name: 'Main Warehouse',
      type: LocationType.WAREHOUSE,
      address: '123 Main St',
      contact_person: 'John Doe',
      phone: '555-1234',
      is_active: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    },
    area_id: null,
    area: null,
    quantity: 50,
    batchNumber: 'BATCH-001',
    expiry_date: null,
    cost_per_unit: 10.5,
    received_date: new Date('2024-01-15'),
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockInventoryRepository = {
      findAllPaginated: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByProductId: jest.fn(),
      findByLocationId: jest.fn(),
      findByAreaId: jest.fn(),
      findByProductAndLocation: jest.fn(),
      existsById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      adjustQuantity: jest.fn(),
      delete: jest.fn(),
    };

    const mockProductsService = {
      existsById: jest.fn(),
    };

    const mockLocationsService = {
      existsById: jest.fn(),
    };

    const mockAreasService = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: InventoryRepository, useValue: mockInventoryRepository },
        { provide: ProductsService, useValue: mockProductsService },
        { provide: LocationsService, useValue: mockLocationsService },
        { provide: AreasService, useValue: mockAreasService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    inventoryRepository = module.get(InventoryRepository);
    productsService = module.get(ProductsService);
    locationsService = module.get(LocationsService);
    areasService = module.get(AreasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPaginated', () => {
    it('should return paginated inventory items', async () => {
      const paginatedResult: PaginatedResult<Inventory> = {
        data: [mockInventory],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      };
      inventoryRepository.findAllPaginated.mockResolvedValue(paginatedResult);

      const result = await service.findAllPaginated({
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.has_next).toBe(false);
      expect(result.meta.has_previous).toBe(false);
    });

    it('should handle pagination metadata correctly', async () => {
      const paginatedResult: PaginatedResult<Inventory> = {
        data: [mockInventory],
        total: 50,
        page: 2,
        limit: 20,
        total_pages: 3,
      };
      inventoryRepository.findAllPaginated.mockResolvedValue(paginatedResult);

      const result = await service.findAllPaginated({
        page: 2,
        limit: 20,
      });

      expect(result.meta.has_next).toBe(true);
      expect(result.meta.has_previous).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return all inventory items', async () => {
      inventoryRepository.findAll.mockResolvedValue([mockInventory]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].product_id).toBe('product-001');
    });
  });

  describe('findOne', () => {
    it('should return an inventory item by id', async () => {
      inventoryRepository.findById.mockResolvedValue(mockInventory);

      const result = await service.findOne('inventory-001');

      expect(result.id).toBe('inventory-001');
      expect(result.quantity).toBe(50);
    });

    it('should throw NotFoundException when inventory item does not exist', async () => {
      inventoryRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByProduct', () => {
    it('should return inventory items for a product', async () => {
      productsService.existsById.mockResolvedValue(true);
      inventoryRepository.findByProductId.mockResolvedValue([mockInventory]);

      const result = await service.findByProduct('product-001');

      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      productsService.existsById.mockResolvedValue(false);

      await expect(service.findByProduct('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByLocation', () => {
    it('should return inventory items for a location', async () => {
      locationsService.existsById.mockResolvedValue(true);
      inventoryRepository.findByLocationId.mockResolvedValue([mockInventory]);

      const result = await service.findByLocation('location-001');

      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException when location does not exist', async () => {
      locationsService.existsById.mockResolvedValue(false);

      await expect(
        service.findByLocation('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      product_id: 'product-001',
      location_id: 'location-001',
      quantity: 100,
    };

    it('should create an inventory item successfully', async () => {
      productsService.existsById.mockResolvedValue(true);
      locationsService.existsById.mockResolvedValue(true);
      inventoryRepository.findByProductAndLocation.mockResolvedValue(null);
      inventoryRepository.create.mockResolvedValue(mockInventory);
      inventoryRepository.findById.mockResolvedValue(mockInventory);

      const result = await service.create(createDto);

      expect(result.product_id).toBe('product-001');
      expect(result.location_id).toBe('location-001');
    });

    it('should throw BadRequestException when product not found', async () => {
      productsService.existsById.mockResolvedValue(false);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Product not found',
      );
    });

    it('should throw BadRequestException when location not found', async () => {
      productsService.existsById.mockResolvedValue(true);
      locationsService.existsById.mockResolvedValue(false);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Location not found',
      );
    });

    it('should throw BadRequestException when area not found', async () => {
      const dtoWithArea = { ...createDto, area_id: 'non-existent-area' };
      productsService.existsById.mockResolvedValue(true);
      locationsService.existsById.mockResolvedValue(true);
      areasService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.create(dtoWithArea)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithArea)).rejects.toThrow(
        'Area not found',
      );
    });

    it('should throw BadRequestException when area belongs to different location', async () => {
      const dtoWithArea = { ...createDto, area_id: 'area-001' };
      productsService.existsById.mockResolvedValue(true);
      locationsService.existsById.mockResolvedValue(true);
      areasService.findById.mockResolvedValue({
        id: 'area-001',
        location_id: 'different-location',
        parent_id: null,
        name: 'Zone A',
        code: 'A1',
        description: '',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      } as any);

      await expect(service.create(dtoWithArea)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithArea)).rejects.toThrow(
        'Area must belong to the specified location',
      );
    });

    it('should throw BadRequestException when inventory already exists for product/location', async () => {
      productsService.existsById.mockResolvedValue(true);
      locationsService.existsById.mockResolvedValue(true);
      inventoryRepository.findByProductAndLocation.mockResolvedValue(
        mockInventory,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Inventory for this product at this location/area already exists',
      );
    });

    it('should create inventory with area when area belongs to correct location', async () => {
      const dtoWithArea = { ...createDto, area_id: 'area-001' };
      const inventoryWithArea = {
        ...mockInventory,
        area_id: 'area-001',
        area: {
          id: 'area-001',
          location_id: 'location-001',
          name: 'Zone A',
          code: 'A1',
        },
      };
      productsService.existsById.mockResolvedValue(true);
      locationsService.existsById.mockResolvedValue(true);
      areasService.findById.mockResolvedValue({
        id: 'area-001',
        location_id: 'location-001',
        parent_id: null,
        name: 'Zone A',
        code: 'A1',
        description: '',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      } as any);
      inventoryRepository.findByProductAndLocation.mockResolvedValue(null);
      inventoryRepository.create.mockResolvedValue(inventoryWithArea as any);
      inventoryRepository.findById.mockResolvedValue(inventoryWithArea as any);

      const result = await service.create(dtoWithArea);

      expect(result.area_id).toBe('area-001');
    });
  });

  describe('adjustQuantity', () => {
    it('should adjust quantity positively', async () => {
      const adjustedInventory = { ...mockInventory, quantity: 60 };
      inventoryRepository.findById
        .mockResolvedValueOnce(mockInventory)
        .mockResolvedValueOnce(adjustedInventory);
      inventoryRepository.adjustQuantity.mockResolvedValue(1);

      const result = await service.adjustQuantity('inventory-001', {
        adjustment: 10,
      });

      expect(result.quantity).toBe(60);
    });

    it('should adjust quantity negatively', async () => {
      const adjustedInventory = { ...mockInventory, quantity: 40 };
      inventoryRepository.findById
        .mockResolvedValueOnce(mockInventory)
        .mockResolvedValueOnce(adjustedInventory);
      inventoryRepository.adjustQuantity.mockResolvedValue(1);

      const result = await service.adjustQuantity('inventory-001', {
        adjustment: -10,
      });

      expect(result.quantity).toBe(40);
    });

    it('should throw NotFoundException when inventory does not exist', async () => {
      inventoryRepository.findById.mockResolvedValue(null);

      await expect(
        service.adjustQuantity('non-existent-id', {
          adjustment: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when adjustment would make quantity negative', async () => {
      inventoryRepository.findById.mockResolvedValue(mockInventory);

      await expect(
        service.adjustQuantity('inventory-001', {
          adjustment: -100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when DB constraint prevents negative quantity', async () => {
      inventoryRepository.findById.mockResolvedValue(mockInventory);
      inventoryRepository.adjustQuantity.mockResolvedValue(0);

      await expect(
        service.adjustQuantity('inventory-001', {
          adjustment: -10,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete inventory item', async () => {
      inventoryRepository.findById.mockResolvedValue(mockInventory);
      inventoryRepository.delete.mockResolvedValue(undefined);

      await service.delete('inventory-001');

      expect(inventoryRepository.delete).toHaveBeenCalledWith('inventory-001');
    });

    it('should throw NotFoundException when inventory does not exist', async () => {
      inventoryRepository.findById.mockResolvedValue(null);

      await expect(service.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
