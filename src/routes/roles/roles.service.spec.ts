import { Test, type TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Permission, Resource } from '@librestock/types/auth'
import { RolesService } from './roles.service';
import { RolesRepository } from './roles.repository';
import { type RoleEntity } from './entities/role.entity';
import { type RolePermissionEntity } from './entities/role-permission.entity';

describe('RolesService', () => {
  let service: RolesService;
  let rolesRepository: jest.Mocked<RolesRepository>;
  let dataSource: jest.Mocked<DataSource>;

  const mockPermissionEntity = (
    resource: string,
    permission: string,
  ): RolePermissionEntity =>
    ({
      id: `perm-${resource}-${permission}`,
      role_id: 'role-1',
      resource,
      permission,
    }) as RolePermissionEntity;

  const mockRole: RoleEntity = {
    id: 'role-1',
    name: 'Admin',
    description: 'Full system access',
    is_system: true,
    permissions: [
      mockPermissionEntity(Resource.PRODUCTS, Permission.READ),
      mockPermissionEntity(Resource.PRODUCTS, Permission.WRITE),
    ],
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  } as RoleEntity;

  const mockCustomRole: RoleEntity = {
    id: 'role-2',
    name: 'Custom Role',
    description: 'A custom role',
    is_system: false,
    permissions: [mockPermissionEntity(Resource.PRODUCTS, Permission.READ)],
    created_at: new Date('2024-02-01'),
    updated_at: new Date('2024-02-01'),
  } as RoleEntity;

  beforeEach(async () => {
    const mockRolesRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      replacePermissions: jest.fn(),
    };

    const mockDataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: RolesRepository,
          useValue: mockRolesRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    rolesRepository = module.get(RolesRepository);
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all roles mapped to response DTOs', async () => {
      rolesRepository.findAll.mockResolvedValue([mockRole, mockCustomRole]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('role-1');
      expect(result[0].name).toBe('Admin');
      expect(result[0].is_system).toBe(true);
      expect(result[0].permissions).toHaveLength(2);
      expect(result[1].id).toBe('role-2');
    });

    it('should return empty array when no roles exist', async () => {
      rolesRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a role by id', async () => {
      rolesRepository.findById.mockResolvedValue(mockRole);

      const result = await service.findById('role-1');

      expect(result.id).toBe('role-1');
      expect(result.name).toBe('Admin');
      expect(result.permissions).toHaveLength(2);
      expect(result.permissions[0].resource).toBe(Resource.PRODUCTS);
    });

    it('should throw NotFoundException when role does not exist', async () => {
      rolesRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('non-existent')).rejects.toThrow(
        'Role with ID non-existent not found',
      );
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'New Role',
      description: 'A new role',
      permissions: [
        { resource: Resource.PRODUCTS, permission: Permission.READ },
      ],
    };

    it('should create a role successfully', async () => {
      rolesRepository.findByName.mockResolvedValue(null);
      const createdEntity = {
        ...mockCustomRole,
        id: 'new-role-id',
        name: 'New Role',
        description: 'A new role',
      } as RoleEntity;
      rolesRepository.create.mockResolvedValue(createdEntity);
      rolesRepository.replacePermissions.mockResolvedValue(undefined);
      rolesRepository.findById.mockResolvedValue(createdEntity);

      const result = await service.create(createDto);

      expect(rolesRepository.findByName).toHaveBeenCalledWith('New Role');
      expect(rolesRepository.create).toHaveBeenCalledWith({
        name: 'New Role',
        description: 'A new role',
        is_system: false,
      });
      expect(rolesRepository.replacePermissions).toHaveBeenCalledWith(
        'new-role-id',
        createDto.permissions,
      );
      expect(result.name).toBe('New Role');
    });

    it('should throw ConflictException when name already exists', async () => {
      rolesRepository.findByName.mockResolvedValue(mockRole);

      await expect(
        service.create({ ...createDto, name: 'Admin' }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.create({ ...createDto, name: 'Admin' }),
      ).rejects.toThrow('Role with name "Admin" already exists');
    });

    it('should set description to null when not provided', async () => {
      rolesRepository.findByName.mockResolvedValue(null);
      const createdEntity = {
        ...mockCustomRole,
        id: 'new-role-id',
        name: 'Minimal Role',
        description: null,
      } as RoleEntity;
      rolesRepository.create.mockResolvedValue(createdEntity);
      rolesRepository.replacePermissions.mockResolvedValue(undefined);
      rolesRepository.findById.mockResolvedValue(createdEntity);

      await service.create({
        name: 'Minimal Role',
        permissions: [],
      });

      expect(rolesRepository.create).toHaveBeenCalledWith({
        name: 'Minimal Role',
        description: null,
        is_system: false,
      });
    });
  });

  describe('update', () => {
    it('should update role name and description', async () => {
      rolesRepository.findById
        .mockResolvedValueOnce(mockCustomRole)
        .mockResolvedValueOnce({
          ...mockCustomRole,
          name: 'Updated Role',
          description: 'Updated description',
        } as RoleEntity);
      rolesRepository.findByName.mockResolvedValue(null);
      rolesRepository.update.mockResolvedValue(undefined);

      const result = await service.update('role-2', {
        name: 'Updated Role',
        description: 'Updated description',
      });

      expect(rolesRepository.update).toHaveBeenCalledWith('role-2', {
        name: 'Updated Role',
        description: 'Updated description',
      });
      expect(result.name).toBe('Updated Role');
    });

    it('should throw NotFoundException when role does not exist', async () => {
      rolesRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new name already taken', async () => {
      rolesRepository.findById.mockResolvedValue(mockCustomRole);
      rolesRepository.findByName.mockResolvedValue(mockRole);

      await expect(
        service.update('role-2', { name: 'Admin' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should skip name uniqueness check when name is unchanged', async () => {
      rolesRepository.findById
        .mockResolvedValueOnce(mockCustomRole)
        .mockResolvedValueOnce(mockCustomRole);
      rolesRepository.update.mockResolvedValue(undefined);

      await service.update('role-2', { name: 'Custom Role' });

      expect(rolesRepository.findByName).not.toHaveBeenCalled();
    });

    it('should replace permissions and clear cache when permissions provided', async () => {
      const newPerms = [
        { resource: Resource.INVENTORY, permission: Permission.WRITE },
      ];
      rolesRepository.findById
        .mockResolvedValueOnce(mockCustomRole)
        .mockResolvedValueOnce(mockCustomRole);
      rolesRepository.replacePermissions.mockResolvedValue(undefined);

      await service.update('role-2', { permissions: newPerms });

      expect(rolesRepository.replacePermissions).toHaveBeenCalledWith(
        'role-2',
        newPerms,
      );
    });

    it('should clear all cache when role name changes', async () => {
      rolesRepository.findById
        .mockResolvedValueOnce(mockCustomRole)
        .mockResolvedValueOnce({
          ...mockCustomRole,
          name: 'Updated Role Name',
        } as RoleEntity);
      rolesRepository.findByName.mockResolvedValue(null);
      rolesRepository.update.mockResolvedValue(undefined);

      dataSource.query.mockResolvedValue([
        {
          role_name: 'Custom Role',
          resource: Resource.PRODUCTS,
          permission: Permission.READ,
        },
      ]);
      await service.getPermissionsForUser('user-1');

      await service.update('role-2', { name: 'Updated Role Name' });
      await service.getPermissionsForUser('user-1');

      expect(dataSource.query).toHaveBeenCalledTimes(2);
    });

    it('should not call update when no name or description changes', async () => {
      rolesRepository.findById
        .mockResolvedValueOnce(mockCustomRole)
        .mockResolvedValueOnce(mockCustomRole);

      await service.update('role-2', {});

      expect(rolesRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a non-system role', async () => {
      rolesRepository.findById.mockResolvedValue(mockCustomRole);
      rolesRepository.delete.mockResolvedValue(undefined);

      await service.delete('role-2');

      expect(rolesRepository.delete).toHaveBeenCalledWith('role-2');
    });

    it('should throw NotFoundException when role does not exist', async () => {
      rolesRepository.findById.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when deleting a system role', async () => {
      rolesRepository.findById.mockResolvedValue(mockRole);

      await expect(service.delete('role-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.delete('role-1')).rejects.toThrow(
        'System roles cannot be deleted',
      );
    });

    it('should clear all cache after deletion', async () => {
      rolesRepository.findById.mockResolvedValue(mockCustomRole);
      rolesRepository.delete.mockResolvedValue(undefined);

      // Prime the cache
      dataSource.query.mockResolvedValue([
        {
          role_name: 'Custom Role',
          resource: Resource.PRODUCTS,
          permission: Permission.READ,
        },
      ]);
      await service.getPermissionsForUser('user-1');

      await service.delete('role-2');

      // After delete + clearAllCache, next call should fetch from DB again
      dataSource.query.mockResolvedValue([]);
      await service.getPermissionsForUser('user-1');

      expect(dataSource.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPermissionsForUser', () => {
    const dbRows = [
      {
        role_name: 'Admin',
        resource: Resource.PRODUCTS,
        permission: Permission.READ,
      },
      {
        role_name: 'Admin',
        resource: Resource.PRODUCTS,
        permission: Permission.WRITE,
      },
      {
        role_name: 'Admin',
        resource: Resource.INVENTORY,
        permission: Permission.READ,
      },
    ];

    it('should fetch from DB when cache is empty', async () => {
      dataSource.query.mockResolvedValue(dbRows);

      const result = await service.getPermissionsForUser('user-1');

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT r.name AS role_name'),
        ['user-1'],
      );
      expect(result.roleNames).toEqual(['Admin']);
      expect(result.permissions[Resource.PRODUCTS]).toEqual(
        expect.arrayContaining([Permission.READ, Permission.WRITE]),
      );
      expect(result.permissions[Resource.INVENTORY]).toEqual([
        Permission.READ,
      ]);
    });

    it('should return cached result when cache is valid', async () => {
      dataSource.query.mockResolvedValue(dbRows);

      // First call: populates cache
      const first = await service.getPermissionsForUser('user-1');
      // Second call: should use cache
      const second = await service.getPermissionsForUser('user-1');

      expect(dataSource.query).toHaveBeenCalledTimes(1);
      expect(second).toEqual(first);
    });

    it('should fetch from DB when cache is expired', async () => {
      dataSource.query.mockResolvedValue(dbRows);

      await service.getPermissionsForUser('user-1');

      // Simulate cache expiration by manipulating Date.now
      const realDateNow = Date.now;
      Date.now = jest.fn(() => realDateNow() + 11_000); // 11 seconds later

      try {
        await service.getPermissionsForUser('user-1');
        expect(dataSource.query).toHaveBeenCalledTimes(2);
      } finally {
        Date.now = realDateNow;
      }
    });

    it('should return empty permissions when user has no roles', async () => {
      dataSource.query.mockResolvedValue([]);

      const result = await service.getPermissionsForUser('user-no-roles');

      expect(result.roleNames).toEqual([]);
      expect(result.permissions).toEqual({});
    });

    it('should deduplicate role names', async () => {
      dataSource.query.mockResolvedValue([
        {
          role_name: 'Admin',
          resource: Resource.PRODUCTS,
          permission: Permission.READ,
        },
        {
          role_name: 'Admin',
          resource: Resource.INVENTORY,
          permission: Permission.READ,
        },
      ]);

      const result = await service.getPermissionsForUser('user-1');

      expect(result.roleNames).toEqual(['Admin']);
    });

    it('should handle multiple roles for same user', async () => {
      dataSource.query.mockResolvedValue([
        {
          role_name: 'Admin',
          resource: Resource.PRODUCTS,
          permission: Permission.WRITE,
        },
        {
          role_name: 'Picker',
          resource: Resource.INVENTORY,
          permission: Permission.READ,
        },
      ]);

      const result = await service.getPermissionsForUser('user-multi');

      expect(result.roleNames).toContain('Admin');
      expect(result.roleNames).toContain('Picker');
      expect(result.permissions[Resource.PRODUCTS]).toContain(Permission.WRITE);
      expect(result.permissions[Resource.INVENTORY]).toContain(Permission.READ);
    });
  });

  describe('clearCacheForUser', () => {
    it('should remove specific user entry from cache', async () => {
      dataSource.query.mockResolvedValue([
        {
          role_name: 'Admin',
          resource: Resource.PRODUCTS,
          permission: Permission.READ,
        },
      ]);

      // Populate cache for two users
      await service.getPermissionsForUser('user-1');
      await service.getPermissionsForUser('user-2');
      expect(dataSource.query).toHaveBeenCalledTimes(2);

      // Clear only user-1
      service.clearCacheForUser('user-1');

      // user-1 should refetch from DB
      await service.getPermissionsForUser('user-1');
      expect(dataSource.query).toHaveBeenCalledTimes(3);

      // user-2 should still be cached
      await service.getPermissionsForUser('user-2');
      expect(dataSource.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('clearAllCache', () => {
    it('should empty the entire cache', async () => {
      dataSource.query.mockResolvedValue([
        {
          role_name: 'Admin',
          resource: Resource.PRODUCTS,
          permission: Permission.READ,
        },
      ]);

      // Populate cache for multiple users
      await service.getPermissionsForUser('user-1');
      await service.getPermissionsForUser('user-2');
      expect(dataSource.query).toHaveBeenCalledTimes(2);

      service.clearAllCache();

      // Both users should refetch from DB
      await service.getPermissionsForUser('user-1');
      await service.getPermissionsForUser('user-2');
      expect(dataSource.query).toHaveBeenCalledTimes(4);
    });
  });
});
