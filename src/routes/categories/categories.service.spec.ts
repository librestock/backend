import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoryRepository } from './category.repository';
import { type Category } from './entities/category.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoryRepository: jest.Mocked<CategoryRepository>;

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

  const mockChildCategory: Category = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Smartphones',
    parent_id: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Smartphone devices',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    parent: mockCategory,
    children: [],
  };

  beforeEach(async () => {
    const mockCategoryRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      existsById: jest.fn(),
      existsByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
      findAllDescendantIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: CategoryRepository,
          useValue: mockCategoryRepository,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    categoryRepository = module.get(CategoryRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return hierarchical tree of categories', async () => {
      const categories = [mockCategory, mockChildCategory];
      categoryRepository.findAll.mockResolvedValue(categories);

      const result = await service.findAll();

      expect(categoryRepository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Electronics');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].name).toBe('Smartphones');
    });

    it('should return empty array when no categories exist', async () => {
      categoryRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should handle multiple root categories', async () => {
      const anotherRootCategory: Category = {
        ...mockCategory,
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Clothing',
      };
      categoryRepository.findAll.mockResolvedValue([
        mockCategory,
        anotherRootCategory,
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('create', () => {
    it('should create a root category without parent', async () => {
      const createDto = { name: 'Electronics', description: 'Test' };
      categoryRepository.create.mockResolvedValue(mockCategory);

      const result = await service.create(createDto);

      expect(categoryRepository.create).toHaveBeenCalledWith({
        name: 'Electronics',
        parent_id: null,
        description: 'Test',
      });
      expect(result).toEqual(mockCategory);
    });

    it('should create a child category with valid parent', async () => {
      const createDto = {
        name: 'Smartphones',
        parent_id: mockCategory.id,
        description: 'Phones',
      };
      categoryRepository.existsById.mockResolvedValue(true);
      categoryRepository.create.mockResolvedValue(mockChildCategory);

      const result = await service.create(createDto);

      expect(categoryRepository.existsById).toHaveBeenCalledWith(
        mockCategory.id,
      );
      expect(categoryRepository.create).toHaveBeenCalledWith({
        name: 'Smartphones',
        parent_id: mockCategory.id,
        description: 'Phones',
      });
      expect(result).toEqual(mockChildCategory);
    });

    it('should throw BadRequestException when parent does not exist', async () => {
      const createDto = {
        name: 'Smartphones',
        parent_id: 'non-existent-id',
      };
      categoryRepository.existsById.mockResolvedValue(false);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Parent category not found',
      );
    });

    it('should handle null description', async () => {
      const createDto = { name: 'Electronics' };
      categoryRepository.create.mockResolvedValue({
        ...mockCategory,
        description: null,
      });

      await service.create(createDto);

      expect(categoryRepository.create).toHaveBeenCalledWith({
        name: 'Electronics',
        parent_id: null,
        description: null,
      });
    });
  });

  describe('update', () => {
    it('should update category name', async () => {
      const updateDto = { name: 'Updated Electronics' };
      const updatedCategory = { ...mockCategory, name: 'Updated Electronics' };
      categoryRepository.findById
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(updatedCategory);
      categoryRepository.update.mockResolvedValue(1);

      const result = await service.update(mockCategory.id, updateDto);

      expect(categoryRepository.update).toHaveBeenCalledWith(mockCategory.id, {
        name: 'Updated Electronics',
      });
      expect(result.name).toBe('Updated Electronics');
    });

    it('should throw NotFoundException when category does not exist', async () => {
      categoryRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when setting parent to itself', async () => {
      const updateDto = { parent_id: mockCategory.id };
      categoryRepository.findById.mockResolvedValue(mockCategory);

      await expect(service.update(mockCategory.id, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(mockCategory.id, updateDto)).rejects.toThrow(
        'Category cannot be its own parent',
      );
    });

    it('should throw BadRequestException when parent does not exist', async () => {
      const updateDto = { parent_id: 'non-existent-parent' };
      categoryRepository.findById.mockResolvedValue(mockCategory);
      categoryRepository.existsById.mockResolvedValue(false);

      await expect(service.update(mockCategory.id, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(mockCategory.id, updateDto)).rejects.toThrow(
        'Parent category not found',
      );
    });

    it('should throw BadRequestException when update would create circular reference', async () => {
      const grandchildCategory: Category = {
        ...mockCategory,
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Grandchild',
        parent_id: mockChildCategory.id,
      };
      const updateDto = { parent_id: grandchildCategory.id };

      categoryRepository.findById.mockResolvedValue(mockCategory);
      categoryRepository.existsById.mockResolvedValue(true);
      // Simulate circular path: grandchild -> child -> mockCategory (creates cycle)
      categoryRepository.findOne
        .mockResolvedValueOnce({ ...grandchildCategory, parent_id: mockChildCategory.id }) // grandchild's parent
        .mockResolvedValueOnce({ ...mockChildCategory, parent_id: mockCategory.id }); // child's parent - this creates the cycle

      await expect(service.update(mockCategory.id, updateDto)).rejects.toThrow(
        'Cannot set parent: would create a circular reference',
      );
    });

    it('should allow setting parent to null (make root)', async () => {
      const updateDto = { parent_id: null };
      const updatedCategory = { ...mockChildCategory, parent_id: null };
      categoryRepository.findById
        .mockResolvedValueOnce(mockChildCategory)
        .mockResolvedValueOnce(updatedCategory);
      categoryRepository.update.mockResolvedValue(1);

      const result = await service.update(mockChildCategory.id, updateDto);

      expect(categoryRepository.update).toHaveBeenCalledWith(
        mockChildCategory.id,
        { parent_id: null },
      );
      expect(result.parent_id).toBeNull();
    });

    it('should update description', async () => {
      const updateDto = { description: 'New description' };
      const updatedCategory = {
        ...mockCategory,
        description: 'New description',
      };
      categoryRepository.findById
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(updatedCategory);
      categoryRepository.update.mockResolvedValue(1);

      const result = await service.update(mockCategory.id, updateDto);

      expect(categoryRepository.update).toHaveBeenCalledWith(mockCategory.id, {
        description: 'New description',
      });
      expect(result.description).toBe('New description');
    });
  });

  describe('delete', () => {
    it('should delete existing category', async () => {
      categoryRepository.findById.mockResolvedValue(mockCategory);
      categoryRepository.delete.mockResolvedValue(undefined);

      await service.delete(mockCategory.id);

      expect(categoryRepository.delete).toHaveBeenCalledWith(mockCategory.id);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      categoryRepository.findById.mockResolvedValue(null);

      await expect(service.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.delete('non-existent-id')).rejects.toThrow(
        'Category not found',
      );
    });
  });
});
