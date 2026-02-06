import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AreasService } from './areas.service';
import { AreaRepository } from './area.repository';
import { LocationsService } from '../locations/locations.service';
import { type Area } from './entities/area.entity';
import { type Location } from '../locations/entities/location.entity';
import { LocationType } from 'src/common/enums';

describe('AreasService', () => {
  let service: AreasService;
  let areaRepository: jest.Mocked<AreaRepository>;
  let locationsService: jest.Mocked<LocationsService>;

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

  const mockArea: Area = {
    id: 'area-001',
    location_id: 'location-001',
    parent_id: null,
    name: 'Zone A',
    code: 'A1',
    description: 'First zone',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    location: mockLocation,
    parent: null,
    children: [],
  };

  const mockChildArea: Area = {
    id: 'area-002',
    location_id: 'location-001',
    parent_id: 'area-001',
    name: 'Shelf A1',
    code: 'A1-1',
    description: 'First shelf in Zone A',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    location: mockLocation,
    parent: mockArea,
    children: [],
  };

  beforeEach(async () => {
    const mockAreaRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIdWithChildren: jest.fn(),
      findByLocationId: jest.fn(),
      findHierarchyByLocationId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsById: jest.fn(),
    };

    const mockLocationsService = {
      existsById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AreasService,
        { provide: AreaRepository, useValue: mockAreaRepository },
        { provide: LocationsService, useValue: mockLocationsService },
      ],
    }).compile();

    service = module.get<AreasService>(AreasService);
    areaRepository = module.get(AreaRepository);
    locationsService = module.get(LocationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      location_id: 'location-001',
      name: 'Zone A',
      code: 'A1',
    };

    it('should create an area successfully', async () => {
      locationsService.existsById.mockResolvedValue(true);
      areaRepository.create.mockResolvedValue(mockArea);

      const result = await service.create(createDto);

      expect(result.name).toBe('Zone A');
      expect(areaRepository.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw BadRequestException when location does not exist', async () => {
      locationsService.existsById.mockResolvedValue(false);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create a child area with valid parent', async () => {
      const childDto = {
        ...createDto,
        parent_id: 'area-001',
      };
      locationsService.existsById.mockResolvedValue(true);
      areaRepository.findById.mockResolvedValue(mockArea);
      areaRepository.create.mockResolvedValue(mockChildArea);

      const result = await service.create(childDto);

      expect(result.parent_id).toBe('area-001');
    });

    it('should throw BadRequestException when parent area does not exist', async () => {
      const childDto = {
        ...createDto,
        parent_id: 'non-existent',
      };
      locationsService.existsById.mockResolvedValue(true);
      areaRepository.findById.mockResolvedValue(null);

      await expect(service.create(childDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when parent belongs to different location', async () => {
      const childDto = {
        ...createDto,
        parent_id: 'area-001',
      };
      const differentLocationArea = {
        ...mockArea,
        location_id: 'different-location',
      };
      locationsService.existsById.mockResolvedValue(true);
      areaRepository.findById.mockResolvedValue(differentLocationArea);

      await expect(service.create(childDto)).rejects.toThrow(
        'Parent area must belong to the same location',
      );
    });
  });

  describe('findAll', () => {
    it('should return areas without children', async () => {
      areaRepository.findAll.mockResolvedValue([mockArea]);

      const result = await service.findAll({});

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Zone A');
    });

    it('should return hierarchical areas when include_children and location_id are provided', async () => {
      const areaWithChildren = { ...mockArea, children: [mockChildArea] };
      areaRepository.findHierarchyByLocationId.mockResolvedValue([
        areaWithChildren,
      ]);

      const result = await service.findAll({
        include_children: true,
        location_id: 'location-001',
      });

      expect(result).toHaveLength(1);
      expect(
        areaRepository.findHierarchyByLocationId,
      ).toHaveBeenCalledWith('location-001');
    });
  });

  describe('findById', () => {
    it('should return an area by id', async () => {
      areaRepository.findById.mockResolvedValue(mockArea);

      const result = await service.findById('area-001');

      expect(result.id).toBe('area-001');
    });

    it('should throw NotFoundException when area does not exist', async () => {
      areaRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByIdWithChildren', () => {
    it('should return area with children', async () => {
      const areaWithChildren = { ...mockArea, children: [mockChildArea] };
      areaRepository.findByIdWithChildren.mockResolvedValue(areaWithChildren);

      const result = await service.findByIdWithChildren('area-001');

      expect(result.children).toHaveLength(1);
    });

    it('should throw NotFoundException when area does not exist', async () => {
      areaRepository.findByIdWithChildren.mockResolvedValue(null);

      await expect(
        service.findByIdWithChildren('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an area successfully', async () => {
      const updateDto = { name: 'Updated Zone' };
      const updatedArea = { ...mockArea, name: 'Updated Zone' };
      areaRepository.findById.mockResolvedValue(mockArea);
      areaRepository.update.mockResolvedValue(updatedArea);

      const result = await service.update('area-001', updateDto);

      expect(result.name).toBe('Updated Zone');
    });

    it('should throw NotFoundException when area does not exist', async () => {
      areaRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when setting parent to itself', async () => {
      areaRepository.findById.mockResolvedValue(mockArea);

      await expect(
        service.update('area-001', { parent_id: 'area-001' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('area-001', { parent_id: 'area-001' }),
      ).rejects.toThrow('Area cannot be its own parent');
    });

    it('should throw BadRequestException when parent does not exist', async () => {
      areaRepository.findById
        .mockResolvedValueOnce(mockArea)
        .mockResolvedValueOnce(null);

      await expect(
        service.update('area-001', { parent_id: 'non-existent' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when parent belongs to different location', async () => {
      const differentLocationArea = {
        ...mockChildArea,
        location_id: 'different-location',
      };
      areaRepository.findById
        .mockResolvedValueOnce(mockArea)
        .mockResolvedValueOnce(differentLocationArea);

      await expect(
        service.update('area-001', { parent_id: 'area-002' }),
      ).rejects.toThrow('Parent area must belong to the same location');
    });

    it('should throw BadRequestException when update would create circular reference', async () => {
      // area-001 -> area-002 (child), trying to set area-001's parent to area-002
      areaRepository.findById
        .mockResolvedValueOnce(mockArea) // existing area
        .mockResolvedValueOnce({ ...mockChildArea, location_id: 'location-001' }) // parent area (area-002)
        .mockResolvedValueOnce(mockChildArea) // checking circular: area-002
        .mockResolvedValueOnce(mockArea); // checking circular: area-001 (match!) -> circular

      await expect(
        service.update('area-001', { parent_id: 'area-002' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when update returns null', async () => {
      areaRepository.findById.mockResolvedValue(mockArea);
      areaRepository.update.mockResolvedValue(null);

      await expect(
        service.update('area-001', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete an area', async () => {
      areaRepository.existsById.mockResolvedValue(true);
      areaRepository.delete.mockResolvedValue(true);

      await service.delete('area-001');

      expect(areaRepository.delete).toHaveBeenCalledWith('area-001');
    });

    it('should throw NotFoundException when area does not exist', async () => {
      areaRepository.existsById.mockResolvedValue(false);

      await expect(service.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when delete returns false', async () => {
      areaRepository.existsById.mockResolvedValue(true);
      areaRepository.delete.mockResolvedValue(false);

      await expect(service.delete('area-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
