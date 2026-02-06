import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationRepository, type PaginatedResult } from './location.repository';
import { type Location } from './entities/location.entity';
import { LocationType } from 'src/common/enums';

describe('LocationsService', () => {
  let service: LocationsService;
  let locationRepository: jest.Mocked<LocationRepository>;

  const mockLocation: Location = {
    id: 'location-001',
    name: 'Main Warehouse',
    type: LocationType.WAREHOUSE,
    address: '123 Main St',
    contact_person: 'John Doe',
    phone: '555-1234',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockLocationRepository = {
      findAllPaginated: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      existsById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: LocationRepository, useValue: mockLocationRepository },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
    locationRepository = module.get(LocationRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPaginated', () => {
    it('should return paginated locations', async () => {
      const paginatedResult: PaginatedResult<Location> = {
        data: [mockLocation],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      };
      locationRepository.findAllPaginated.mockResolvedValue(paginatedResult);

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
      const paginatedResult: PaginatedResult<Location> = {
        data: [mockLocation],
        total: 50,
        page: 2,
        limit: 20,
        total_pages: 3,
      };
      locationRepository.findAllPaginated.mockResolvedValue(paginatedResult);

      const result = await service.findAllPaginated({
        page: 2,
        limit: 20,
      });

      expect(result.meta.has_next).toBe(true);
      expect(result.meta.has_previous).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return all locations', async () => {
      locationRepository.findAll.mockResolvedValue([mockLocation]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Main Warehouse');
    });

    it('should return empty array when no locations exist', async () => {
      locationRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a location by id', async () => {
      locationRepository.findById.mockResolvedValue(mockLocation);

      const result = await service.findOne('location-001');

      expect(result.id).toBe('location-001');
      expect(result.name).toBe('Main Warehouse');
    });

    it('should throw NotFoundException when location does not exist', async () => {
      locationRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Location not found',
      );
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'Main Warehouse',
      type: LocationType.WAREHOUSE,
    };

    it('should create a location successfully', async () => {
      locationRepository.create.mockResolvedValue(mockLocation);

      const result = await service.create(createDto);

      expect(result.name).toBe('Main Warehouse');
      expect(result.type).toBe(LocationType.WAREHOUSE);
    });

    it('should create a location with optional fields', async () => {
      const createDtoWithOptional = {
        ...createDto,
        address: '123 Main St',
        contact_person: 'John Doe',
        phone: '555-1234',
        is_active: false,
      };
      const inactiveLocation = { ...mockLocation, is_active: false };
      locationRepository.create.mockResolvedValue(inactiveLocation);

      const result = await service.create(createDtoWithOptional);

      expect(result.is_active).toBe(false);
      expect(locationRepository.create).toHaveBeenCalledWith({
        name: 'Main Warehouse',
        type: LocationType.WAREHOUSE,
        address: '123 Main St',
        contact_person: 'John Doe',
        phone: '555-1234',
        is_active: false,
      });
    });

    it('should default optional fields', async () => {
      locationRepository.create.mockResolvedValue(mockLocation);

      await service.create(createDto);

      expect(locationRepository.create).toHaveBeenCalledWith({
        name: 'Main Warehouse',
        type: LocationType.WAREHOUSE,
        address: '',
        contact_person: '',
        phone: '',
        is_active: true,
      });
    });
  });

  describe('update', () => {
    it('should update location successfully', async () => {
      const updateDto = { name: 'Updated Warehouse' };
      const updatedLocation = { ...mockLocation, name: 'Updated Warehouse' };
      locationRepository.findById
        .mockResolvedValueOnce(mockLocation)
        .mockResolvedValueOnce(updatedLocation);
      locationRepository.update.mockResolvedValue(1);

      const result = await service.update('location-001', updateDto);

      expect(result.name).toBe('Updated Warehouse');
    });

    it('should throw NotFoundException when location does not exist', async () => {
      locationRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return existing location when no changes provided', async () => {
      locationRepository.findById.mockResolvedValue(mockLocation);

      const result = await service.update('location-001', {});

      expect(locationRepository.update).not.toHaveBeenCalled();
      expect(result.id).toBe('location-001');
    });
  });

  describe('delete', () => {
    it('should delete a location', async () => {
      locationRepository.findById.mockResolvedValue(mockLocation);
      locationRepository.delete.mockResolvedValue(undefined);

      await service.delete('location-001');

      expect(locationRepository.delete).toHaveBeenCalledWith('location-001');
    });

    it('should throw NotFoundException when location does not exist', async () => {
      locationRepository.findById.mockResolvedValue(null);

      await expect(service.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.delete('non-existent-id')).rejects.toThrow(
        'Location not found',
      );
    });
  });
});
