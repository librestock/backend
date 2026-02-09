import { Test, type TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import {
  type MockRequest,
  createExecutionContext,
} from '../../test-utils/execution-context';
import { UserRole } from '../enums';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;
  let dataSource: jest.Mocked<DataSource>;

  const mockRequest: MockRequest = {
    params: { id: 'entity-123' },
    body: {},
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
    session: { user: { id: 'user_123' } },
  };

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockDataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createExecutionContext(mockRequest);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('should allow access when required roles is empty array', async () => {
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = createExecutionContext(mockRequest);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has matching DB role', async () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      dataSource.query.mockResolvedValue([{ role: UserRole.ADMIN }]);
      const context = createExecutionContext(mockRequest);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(dataSource.query).toHaveBeenCalledWith(
        'SELECT role FROM user_roles WHERE user_id = $1',
        ['user_123'],
      );
    });

    it('should allow access when user has one of multiple required roles', async () => {
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.ADMIN,
        UserRole.WAREHOUSE_MANAGER,
      ]);
      dataSource.query.mockResolvedValue([
        { role: UserRole.WAREHOUSE_MANAGER },
      ]);
      const context = createExecutionContext(mockRequest);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required role', async () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      dataSource.query.mockResolvedValue([
        { role: UserRole.WAREHOUSE_MANAGER },
      ]);
      const context = createExecutionContext(mockRequest);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Insufficient role permissions',
      );
    });

    it('should throw ForbiddenException when user has no roles at all', async () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      dataSource.query.mockResolvedValue([]);
      const noRolesRequest = {
        ...mockRequest,
        session: { user: { id: 'user_123' } },
      };
      const context = createExecutionContext(noRolesRequest);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should fall back to session roles when DB query returns empty', async () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      dataSource.query.mockResolvedValue([]);
      const sessionRolesRequest = {
        ...mockRequest,
        session: {
          user: { id: 'user_123', role: UserRole.ADMIN },
        },
      };
      const context = createExecutionContext(sessionRolesRequest);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should fall back to session roles array', async () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      dataSource.query.mockResolvedValue([]);
      const sessionRolesRequest = {
        ...mockRequest,
        session: {
          user: {
            id: 'user_123',
            roles: [UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER],
          },
        },
      };
      const context = createExecutionContext(sessionRolesRequest);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should fall back to session roles when DB query fails', async () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      dataSource.query.mockRejectedValue(new Error('Table does not exist'));
      const sessionRolesRequest = {
        ...mockRequest,
        session: {
          user: { id: 'user_123', role: UserRole.ADMIN },
        },
      };
      const context = createExecutionContext(sessionRolesRequest);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when no session exists', async () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const noSessionRequest = {
        ...mockRequest,
        session: undefined,
      };
      const context = createExecutionContext(noSessionRequest);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should not query DB when userId is not available', async () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const noUserIdRequest = {
        ...mockRequest,
        session: { user: {} },
      };
      const context = createExecutionContext(noUserIdRequest);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('should prefer DB roles over session roles when DB returns results', async () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      dataSource.query.mockResolvedValue([{ role: UserRole.PICKER }]);
      const sessionRolesRequest = {
        ...mockRequest,
        session: {
          user: { id: 'user_123', role: UserRole.ADMIN },
        },
      };
      const context = createExecutionContext(sessionRolesRequest);

      // DB says PICKER, session says ADMIN - should use DB (PICKER) and deny
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should extract roles from session user.metadata.roles', async () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      dataSource.query.mockResolvedValue([]);
      const metadataRolesRequest = {
        ...mockRequest,
        session: {
          user: {
            id: 'user_123',
            metadata: { roles: [UserRole.ADMIN] },
          },
        },
      };
      const context = createExecutionContext(metadataRolesRequest);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
