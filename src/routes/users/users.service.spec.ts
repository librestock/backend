import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, type Repository } from 'typeorm';
import { auth } from '../../auth';
import { RolesService } from '../roles/roles.service';
import { UserRoleEntity } from './entities/user-role.entity';

// Import after mock is set up
import { UsersService } from './users.service';

jest.mock('../../auth', () => ({
  auth: {
    api: {
      listUsers: jest.fn(),
      banUser: jest.fn(),
      unbanUser: jest.fn(),
      removeUser: jest.fn(),
      revokeUserSessions: jest.fn(),
    },
  },
}));

const mockListUsers = auth.api.listUsers as jest.Mock;
const mockBanUser = auth.api.banUser as jest.Mock;
const mockUnbanUser = auth.api.unbanUser as jest.Mock;
const mockRemoveUser = auth.api.removeUser as jest.Mock;
const mockRevokeUserSessions = auth.api.revokeUserSessions as jest.Mock;

describe('UsersService', () => {
  let service: UsersService;
  let userRoleRepository: jest.Mocked<Repository<UserRoleEntity>>;
  let dataSource: jest.Mocked<DataSource>;
  let rolesService: jest.Mocked<RolesService>;

  const mockHeaders = {
    authorization: 'Bearer test-token',
    'content-type': 'application/json',
  };

  const mockBetterAuthUser = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    image: 'https://example.com/avatar.jpg',
    banned: false,
    banReason: null,
    banExpires: null,
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockRoleEntity = {
    id: 'ur-1',
    user_id: 'user-1',
    role_id: 'role-1',
    role: { id: 'role-1', name: 'Admin' },
  } as unknown as UserRoleEntity;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    const mockUserRoleRepository = {
      find: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockDataSource = {
      query: jest.fn(),
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
        }),
      }),
    };

    const mockRolesService = {
      clearCacheForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserRoleEntity),
          useValue: mockUserRoleRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRoleRepository = module.get(getRepositoryToken(UserRoleEntity));
    dataSource = module.get(DataSource);
    rolesService = module.get(RolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listUsers', () => {
    it('should return paginated users with roles', async () => {
      mockListUsers.mockResolvedValue({
        users: [mockBetterAuthUser],
        total: 1,
      });
      userRoleRepository.find.mockResolvedValue([mockRoleEntity]);

      const result = await service.listUsers(
        { page: 1, limit: 20 },
        mockHeaders,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('user-1');
      expect(result.data[0].name).toBe('John Doe');
      expect(result.data[0].roles).toEqual(['Admin']);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total_pages).toBe(1);
    });

    it('should use default pagination values', async () => {
      mockListUsers.mockResolvedValue({
        users: [],
        total: 0,
      });

      await service.listUsers({}, mockHeaders);

      expect(mockListUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            limit: 20,
            offset: 0,
          }),
        }),
      );
    });

    it('should include search params when search is provided', async () => {
      mockListUsers.mockResolvedValue({
        users: [],
        total: 0,
      });

      await service.listUsers(
        { page: 1, limit: 10, search: 'John' },
        mockHeaders,
      );

      expect(mockListUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            searchField: 'name',
            searchValue: 'John',
            searchOperator: 'contains',
          }),
        }),
      );
    });

    it('should filter by role when role query param is provided', async () => {
      const user1 = { ...mockBetterAuthUser, id: 'user-1' };
      const user2 = { ...mockBetterAuthUser, id: 'user-2', name: 'Jane Doe' };
      mockListUsers.mockResolvedValue({
        users: [user1, user2],
        total: 2,
      });

      const adminRole = {
        ...mockRoleEntity,
        user_id: 'user-1',
      } as unknown as UserRoleEntity;
      userRoleRepository.find.mockResolvedValue([adminRole]);

      const result = await service.listUsers(
        { page: 1, limit: 20, role: 'Admin' },
        mockHeaders,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('user-1');
      expect(result.total).toBe(1);
    });

    it('should handle empty user list', async () => {
      mockListUsers.mockResolvedValue({
        users: [],
        total: 0,
      });

      const result = await service.listUsers(
        { page: 1, limit: 20 },
        mockHeaders,
      );

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(userRoleRepository.find).not.toHaveBeenCalled();
    });

    it('should calculate pagination correctly', async () => {
      mockListUsers.mockResolvedValue({
        users: [mockBetterAuthUser],
        total: 50,
      });
      userRoleRepository.find.mockResolvedValue([]);

      const result = await service.listUsers(
        { page: 3, limit: 10 },
        mockHeaders,
      );

      expect(mockListUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            limit: 10,
            offset: 20,
          }),
        }),
      );
      expect(result.total_pages).toBe(5);
    });
  });

  describe('getUser', () => {
    it('should return a user with roles by id', async () => {
      mockListUsers.mockResolvedValue({
        users: [mockBetterAuthUser],
      });
      userRoleRepository.find.mockResolvedValue([mockRoleEntity]);

      const result = await service.getUser('user-1', mockHeaders);

      expect(result.id).toBe('user-1');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.roles).toEqual(['Admin']);
      expect(result.banned).toBe(false);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockListUsers.mockResolvedValue({
        users: [],
      });

      await expect(
        service.getUser('non-existent', mockHeaders),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getUser('non-existent', mockHeaders),
      ).rejects.toThrow('User with ID non-existent not found');
    });

    it('should handle user with no roles', async () => {
      mockListUsers.mockResolvedValue({
        users: [mockBetterAuthUser],
      });
      userRoleRepository.find.mockResolvedValue([]);

      const result = await service.getUser('user-1', mockHeaders);

      expect(result.roles).toEqual([]);
    });

    it('should default optional fields when missing from auth response', async () => {
      mockListUsers.mockResolvedValue({
        users: [
          {
            id: 'user-1',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      });
      userRoleRepository.find.mockResolvedValue([]);

      const result = await service.getUser('user-1', mockHeaders);

      expect(result.name).toBe('');
      expect(result.email).toBe('');
      expect(result.image).toBeNull();
      expect(result.banned).toBe(false);
      expect(result.ban_reason).toBeNull();
      expect(result.ban_expires).toBeNull();
    });
  });

  describe('updateRoles', () => {
    it('should replace all roles for a user', async () => {
      // getUser is called twice: once to verify, once to return
      mockListUsers.mockResolvedValue({
        users: [mockBetterAuthUser],
      });
      userRoleRepository.find.mockResolvedValue([mockRoleEntity]);
      userRoleRepository.delete.mockResolvedValue(undefined as any);
      userRoleRepository.create.mockImplementation(
        (data) => data as UserRoleEntity,
      );
      userRoleRepository.save.mockResolvedValue([] as any);

      const result = await service.updateRoles(
        'user-1',
        ['role-1'],
        mockHeaders,
      );

      expect(userRoleRepository.delete).toHaveBeenCalledWith({
        user_id: 'user-1',
      });
      expect(userRoleRepository.save).toHaveBeenCalled();
      expect(rolesService.clearCacheForUser).toHaveBeenCalledWith('user-1');
      expect(result.id).toBe('user-1');
    });

    it('should handle empty roles array', async () => {
      mockListUsers.mockResolvedValue({
        users: [mockBetterAuthUser],
      });
      userRoleRepository.find.mockResolvedValue([]);
      userRoleRepository.delete.mockResolvedValue(undefined as any);

      await service.updateRoles('user-1', [], mockHeaders);

      expect(userRoleRepository.delete).toHaveBeenCalledWith({
        user_id: 'user-1',
      });
      expect(userRoleRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockListUsers.mockResolvedValue({ users: [] });

      await expect(
        service.updateRoles('non-existent', ['role-1'], mockHeaders),
      ).rejects.toThrow(NotFoundException);
    });

    it('should sync Better Auth role column', async () => {
      mockListUsers.mockResolvedValue({
        users: [mockBetterAuthUser],
      });
      userRoleRepository.find.mockResolvedValue([]);
      userRoleRepository.delete.mockResolvedValue(undefined as any);
      userRoleRepository.create.mockImplementation(
        (data) => data as UserRoleEntity,
      );
      userRoleRepository.save.mockResolvedValue([] as any);

      await service.updateRoles('user-1', ['role-1'], mockHeaders);

      expect(dataSource.query).toHaveBeenCalledWith(
        `UPDATE "user" SET role = $1 WHERE id = $2`,
        [expect.any(String), 'user-1'],
      );
    });
  });

  describe('banUser', () => {
    it('should ban a user', async () => {
      mockListUsers.mockResolvedValue({
        users: [mockBetterAuthUser],
      });
      userRoleRepository.find.mockResolvedValue([]);
      mockBanUser.mockResolvedValue({});

      const result = await service.banUser('user-1', {}, mockHeaders);

      expect(mockBanUser).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { userId: 'user-1' },
        }),
      );
      expect(result.id).toBe('user-1');
    });

    it('should include ban reason when provided', async () => {
      mockListUsers.mockResolvedValue({
        users: [mockBetterAuthUser],
      });
      userRoleRepository.find.mockResolvedValue([]);
      mockBanUser.mockResolvedValue({});

      await service.banUser(
        'user-1',
        { reason: 'Violation of terms' },
        mockHeaders,
      );

      expect(mockBanUser).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            userId: 'user-1',
            banReason: 'Violation of terms',
          }),
        }),
      );
    });

    it('should include ban expiry when provided', async () => {
      const futureDate = new Date(Date.now() + 86_400_000).toISOString();
      mockListUsers.mockResolvedValue({
        users: [mockBetterAuthUser],
      });
      userRoleRepository.find.mockResolvedValue([]);
      mockBanUser.mockResolvedValue({});

      await service.banUser(
        'user-1',
        { expiresAt: futureDate },
        mockHeaders,
      );

      expect(mockBanUser).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            userId: 'user-1',
            banExpiresIn: expect.any(Number),
          }),
        }),
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockListUsers.mockResolvedValue({ users: [] });

      await expect(
        service.banUser('non-existent', {}, mockHeaders),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unbanUser', () => {
    it('should unban a user', async () => {
      mockListUsers.mockResolvedValue({
        users: [{ ...mockBetterAuthUser, banned: true }],
      });
      userRoleRepository.find.mockResolvedValue([]);
      mockUnbanUser.mockResolvedValue({});

      const result = await service.unbanUser('user-1', mockHeaders);

      expect(mockUnbanUser).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { userId: 'user-1' },
        }),
      );
      expect(result.id).toBe('user-1');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockListUsers.mockResolvedValue({ users: [] });

      await expect(
        service.unbanUser('non-existent', mockHeaders),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('should delete user roles and remove from auth', async () => {
      mockListUsers.mockResolvedValue({
        users: [mockBetterAuthUser],
      });
      userRoleRepository.find.mockResolvedValue([]);
      userRoleRepository.delete.mockResolvedValue(undefined as any);
      mockRemoveUser.mockResolvedValue({});

      await service.deleteUser('user-1', mockHeaders);

      expect(userRoleRepository.delete).toHaveBeenCalledWith({
        user_id: 'user-1',
      });
      expect(mockRemoveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { userId: 'user-1' },
        }),
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockListUsers.mockResolvedValue({ users: [] });

      await expect(
        service.deleteUser('non-existent', mockHeaders),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeSessions', () => {
    it('should revoke all sessions for a user', async () => {
      mockListUsers.mockResolvedValue({
        users: [mockBetterAuthUser],
      });
      userRoleRepository.find.mockResolvedValue([]);
      mockRevokeUserSessions.mockResolvedValue({});

      await service.revokeSessions('user-1', mockHeaders);

      expect(mockRevokeUserSessions).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { userId: 'user-1' },
        }),
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockListUsers.mockResolvedValue({ users: [] });

      await expect(
        service.revokeSessions('non-existent', mockHeaders),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
