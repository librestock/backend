import { Test, type TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, Resource } from '@librestock/types/auth'
import { RolesService, type UserPermissions } from '../../routes/roles/roles.service';
import {
  type MockRequest,
  createExecutionContext,
} from '../../test-utils/execution-context';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: jest.Mocked<Reflector>;
  let rolesService: jest.Mocked<RolesService>;

  const mockRequest: MockRequest = {
    params: { id: 'entity-123' },
    body: {},
    headers: {},
    ip: '192.168.1.1',
    socket: { remoteAddress: '127.0.0.1' },
    session: { user: { id: 'user-1' } },
  };

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockRolesService = {
      getPermissionsForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: RolesService, useValue: mockRolesService },
      ],
    }).compile();

    guard = module.get<PermissionGuard>(PermissionGuard);
    reflector = module.get(Reflector);
    rolesService = module.get(RolesService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no permission is required', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createExecutionContext(mockRequest);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rolesService.getPermissionsForUser).not.toHaveBeenCalled();
    });

    it('should allow access when user has the required permission', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        resource: Resource.PRODUCTS,
        permission: Permission.READ,
      });

      const userPermissions: UserPermissions = {
        roleNames: ['Admin'],
        permissions: {
          [Resource.PRODUCTS]: [Permission.READ, Permission.WRITE],
        },
      };
      rolesService.getPermissionsForUser.mockResolvedValue(userPermissions);

      const context = createExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rolesService.getPermissionsForUser).toHaveBeenCalledWith(
        'user-1',
      );
    });

    it('should deny access when user lacks the required permission', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        resource: Resource.USERS,
        permission: Permission.WRITE,
      });

      const userPermissions: UserPermissions = {
        roleNames: ['Picker'],
        permissions: {
          [Resource.PRODUCTS]: [Permission.READ],
          [Resource.INVENTORY]: [Permission.READ],
        },
      };
      rolesService.getPermissionsForUser.mockResolvedValue(userPermissions);

      const context = createExecutionContext(mockRequest);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Insufficient permissions',
      );
    });

    it('should deny access when user has resource but wrong permission', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        resource: Resource.PRODUCTS,
        permission: Permission.WRITE,
      });

      const userPermissions: UserPermissions = {
        roleNames: ['Sales'],
        permissions: {
          [Resource.PRODUCTS]: [Permission.READ],
        },
      };
      rolesService.getPermissionsForUser.mockResolvedValue(userPermissions);

      const context = createExecutionContext(mockRequest);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should deny access when user has no permissions at all', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        resource: Resource.PRODUCTS,
        permission: Permission.READ,
      });

      const userPermissions: UserPermissions = {
        roleNames: [],
        permissions: {},
      };
      rolesService.getPermissionsForUser.mockResolvedValue(userPermissions);

      const context = createExecutionContext(mockRequest);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when session is missing', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        resource: Resource.PRODUCTS,
        permission: Permission.READ,
      });

      const noSessionRequest: MockRequest = {
        ...mockRequest,
        session: undefined,
      };
      const context = createExecutionContext(noSessionRequest);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Insufficient permissions',
      );
    });

    it('should throw ForbiddenException when user id is missing from session', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        resource: Resource.PRODUCTS,
        permission: Permission.READ,
      });

      const noUserIdRequest: MockRequest = {
        ...mockRequest,
        session: { user: {} },
      };
      const context = createExecutionContext(noUserIdRequest);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw InternalServerErrorException on unexpected errors', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        resource: Resource.PRODUCTS,
        permission: Permission.READ,
      });

      rolesService.getPermissionsForUser.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const context = createExecutionContext(mockRequest);

      await expect(guard.canActivate(context)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Failed to resolve user permissions',
      );
    });

    it('should re-throw ForbiddenException without wrapping in InternalServerError', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        resource: Resource.PRODUCTS,
        permission: Permission.READ,
      });

      // Simulate the guard itself throwing ForbiddenException (e.g. from the lack-of-permission path)
      const userPermissions: UserPermissions = {
        roleNames: ['Viewer'],
        permissions: {},
      };
      rolesService.getPermissionsForUser.mockResolvedValue(userPermissions);

      const context = createExecutionContext(mockRequest);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      // Should NOT throw InternalServerErrorException
      await expect(guard.canActivate(context)).rejects.not.toThrow(
        InternalServerErrorException,
      );
    });

    it('should read required permission from handler and class metadata', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        resource: Resource.AUDIT_LOGS,
        permission: Permission.READ,
      });

      const userPermissions: UserPermissions = {
        roleNames: ['Admin'],
        permissions: {
          [Resource.AUDIT_LOGS]: [Permission.READ],
        },
      };
      rolesService.getPermissionsForUser.mockResolvedValue(userPermissions);

      const context = createExecutionContext(mockRequest);
      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        'required_permission',
        expect.arrayContaining([
          expect.any(Function),
          expect.any(Function),
        ]),
      );
    });
  });
});
