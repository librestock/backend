import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StockMovementReason } from '@librestock/types';
import { ProductsService } from '../products/products.service';
import { LocationsService } from '../locations/locations.service';
import { StockMovementsService } from './stock-movements.service';
import {
  StockMovementRepository,
  type PaginatedResult,
} from './stock-movement.repository';
import { type StockMovement } from './entities/stock-movement.entity';

describe('StockMovementsService', () => {
  let service: StockMovementsService;
  let stockMovementRepository: jest.Mocked<StockMovementRepository>;
  let productsService: jest.Mocked<ProductsService>;
  let locationsService: jest.Mocked<LocationsService>;

  const mockStockMovement: StockMovement = {
    id: 'sm-001',
    product_id: 'product-001',
    product: { id: 'product-001', name: 'Widget', sku: 'WDG-001' } as any,
    from_location_id: 'loc-001',
    fromLocation: { id: 'loc-001', name: 'Warehouse A' } as any,
    to_location_id: 'loc-002',
    toLocation: { id: 'loc-002', name: 'Warehouse B' } as any,
    quantity: 10,
    reason: StockMovementReason.INTERNAL_TRANSFER,
    order_id: null,
    order: null,
    reference_number: 'REF-001',
    cost_per_unit: null,
    kanban_task_id: null,
    user_id: 'user-001',
    notes: 'Transfer between warehouses',
    created_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockStockMovementRepository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      findByProductId: jest.fn(),
      findByLocationId: jest.fn(),
      create: jest.fn(),
    };

    const mockProductsService = {
      existsById: jest.fn(),
    };

    const mockLocationsService = {
      existsById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockMovementsService,
        {
          provide: StockMovementRepository,
          useValue: mockStockMovementRepository,
        },
        { provide: ProductsService, useValue: mockProductsService },
        { provide: LocationsService, useValue: mockLocationsService },
      ],
    }).compile();

    service = module.get<StockMovementsService>(StockMovementsService);
    stockMovementRepository = module.get(StockMovementRepository);
    productsService = module.get(ProductsService);
    locationsService = module.get(LocationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPaginated', () => {
    it('should return paginated stock movements', async () => {
      const paginatedResult: PaginatedResult<StockMovement> = {
        data: [mockStockMovement],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      };
      stockMovementRepository.findAllPaginated.mockResolvedValue(
        paginatedResult,
      );

      const result = await service.findAllPaginated({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.has_next).toBe(false);
      expect(result.meta.has_previous).toBe(false);
    });

    it('should handle pagination metadata correctly', async () => {
      const paginatedResult: PaginatedResult<StockMovement> = {
        data: [mockStockMovement],
        total: 50,
        page: 2,
        limit: 20,
        total_pages: 3,
      };
      stockMovementRepository.findAllPaginated.mockResolvedValue(
        paginatedResult,
      );

      const result = await service.findAllPaginated({ page: 2, limit: 20 });

      expect(result.meta.has_next).toBe(true);
      expect(result.meta.has_previous).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a stock movement by id', async () => {
      stockMovementRepository.findById.mockResolvedValue(mockStockMovement);

      const result = await service.findOne('sm-001');

      expect(result.id).toBe('sm-001');
      expect(result.product).toEqual({
        id: 'product-001',
        name: 'Widget',
        sku: 'WDG-001',
      });
      expect(result.from_location).toEqual({
        id: 'loc-001',
        name: 'Warehouse A',
      });
      expect(result.to_location).toEqual({
        id: 'loc-002',
        name: 'Warehouse B',
      });
    });

    it('should throw NotFoundException when stock movement does not exist', async () => {
      stockMovementRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Stock movement not found',
      );
    });
  });

  describe('findByProduct', () => {
    it('should return stock movements for a product', async () => {
      productsService.existsById.mockResolvedValue(true);
      stockMovementRepository.findByProductId.mockResolvedValue([
        mockStockMovement,
      ]);

      const result = await service.findByProduct('product-001');

      expect(result).toHaveLength(1);
      expect(result[0].product_id).toBe('product-001');
    });

    it('should throw NotFoundException when product does not exist', async () => {
      productsService.existsById.mockResolvedValue(false);

      await expect(
        service.findByProduct('non-existent-product'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findByProduct('non-existent-product'),
      ).rejects.toThrow('Product not found');
    });
  });

  describe('findByLocation', () => {
    it('should return stock movements for a location', async () => {
      locationsService.existsById.mockResolvedValue(true);
      stockMovementRepository.findByLocationId.mockResolvedValue([
        mockStockMovement,
      ]);

      const result = await service.findByLocation('loc-001');

      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException when location does not exist', async () => {
      locationsService.existsById.mockResolvedValue(false);

      await expect(
        service.findByLocation('non-existent-location'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findByLocation('non-existent-location'),
      ).rejects.toThrow('Location not found');
    });
  });

  describe('create', () => {
    const createDto = {
      product_id: 'product-001',
      from_location_id: 'loc-001',
      to_location_id: 'loc-002',
      quantity: 10,
      reason: StockMovementReason.INTERNAL_TRANSFER,
    };

    it('should create a stock movement successfully', async () => {
      productsService.existsById.mockResolvedValue(true);
      locationsService.existsById.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue(mockStockMovement);
      stockMovementRepository.findById.mockResolvedValue(mockStockMovement);

      const result = await service.create(createDto, 'user-001');

      expect(result.id).toBe('sm-001');
      expect(result.quantity).toBe(10);
      expect(result.reason).toBe(StockMovementReason.INTERNAL_TRANSFER);
      expect(stockMovementRepository.create).toHaveBeenCalledWith({
        product_id: 'product-001',
        from_location_id: 'loc-001',
        to_location_id: 'loc-002',
        quantity: 10,
        reason: StockMovementReason.INTERNAL_TRANSFER,
        order_id: null,
        reference_number: null,
        cost_per_unit: null,
        notes: null,
        user_id: 'user-001',
      });
    });

    it('should throw BadRequestException when product does not exist', async () => {
      productsService.existsById.mockResolvedValue(false);

      await expect(service.create(createDto, 'user-001')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto, 'user-001')).rejects.toThrow(
        'Product not found',
      );
    });

    it('should throw BadRequestException when source location does not exist', async () => {
      productsService.existsById.mockResolvedValue(true);
      locationsService.existsById.mockResolvedValueOnce(false);

      await expect(service.create(createDto, 'user-001')).rejects.toThrow(
        BadRequestException,
      );

      productsService.existsById.mockResolvedValue(true);
      locationsService.existsById.mockResolvedValueOnce(false);

      await expect(service.create(createDto, 'user-001')).rejects.toThrow(
        'Source location not found',
      );
    });

    it('should throw BadRequestException when destination location does not exist', async () => {
      productsService.existsById.mockResolvedValue(true);
      locationsService.existsById
        .mockResolvedValueOnce(true) // from_location check
        .mockResolvedValueOnce(false); // to_location check

      await expect(service.create(createDto, 'user-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create without locations when not provided', async () => {
      const dtoNoLocations = {
        product_id: 'product-001',
        quantity: 5,
        reason: StockMovementReason.COUNT_CORRECTION,
      };
      const movementNoLoc = {
        ...mockStockMovement,
        from_location_id: null,
        fromLocation: null,
        to_location_id: null,
        toLocation: null,
      };
      productsService.existsById.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue(movementNoLoc);
      stockMovementRepository.findById.mockResolvedValue(movementNoLoc);

      const result = await service.create(dtoNoLocations, 'user-001');

      expect(result.from_location_id).toBeNull();
      expect(result.to_location_id).toBeNull();
      expect(locationsService.existsById).not.toHaveBeenCalled();
    });
  });
});
