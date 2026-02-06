import { Test, type TestingModule } from '@nestjs/testing';
import { type CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError, lastValueFrom } from 'rxjs';
import { AuditLogService } from '../../routes/audit-logs/audit-log.service';
import { AuditAction, AuditEntityType } from '../enums';
import { type AuditMetadata } from '../decorators/auditable.decorator';
import {
  type MockRequest,
  createExecutionContext,
} from '../../test-utils/execution-context';
import { AuditInterceptor } from './audit.interceptor';

/**
 * Flush all pending microtasks (resolved promises).
 * Replaces fragile setTimeout(fn, 10) patterns that cause race conditions.
 */
const flushPromises = () => new Promise<void>((resolve) => process.nextTick(resolve));

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let reflector: jest.Mocked<Reflector>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const mockRequest: MockRequest = {
    params: { id: 'entity-123' },
    body: { name: 'Test' },
    headers: {
      'user-agent': 'Mozilla/5.0',
    },
    ip: '192.168.1.1',
    socket: { remoteAddress: '127.0.0.1' },
    session: { user: { id: 'user_123' } },
  };

  const mockExecutionContext = createExecutionContext(mockRequest);

  const mockCallHandler: CallHandler = {
    handle: jest.fn().mockReturnValue(of({ id: 'response-id', name: 'Test' })),
  };

  beforeEach(async () => {
    const mockReflector = {
      get: jest.fn(),
    };

    const mockAuditLogService = {
      log: jest.fn().mockResolvedValue({}),
      logBulk: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditInterceptor,
        { provide: Reflector, useValue: mockReflector },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    interceptor = module.get<AuditInterceptor>(AuditInterceptor);
    reflector = module.get(Reflector);
    auditLogService = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should pass through when no audit metadata is present', async () => {
      reflector.get.mockReturnValue(undefined);

      const result = await lastValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      );

      expect(result).toEqual({ id: 'response-id', name: 'Test' });
      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    it('should create audit log when metadata is present with entityIdParam', async () => {
      const metadata: AuditMetadata = {
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PRODUCT,
        entityIdParam: 'id',
      };
      reflector.get.mockReturnValue(metadata);

      await lastValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      );
      await flushPromises();

      expect(auditLogService.log).toHaveBeenCalledWith({
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PRODUCT,
        entityId: 'entity-123',
        context: {
          userId: 'user_123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
        changes: null,
      });
    });

    it('should extract entity ID from response when entityIdFromResponse is set', async () => {
      const metadata: AuditMetadata = {
        action: AuditAction.CREATE,
        entityType: AuditEntityType.PRODUCT,
        entityIdFromResponse: 'id',
      };
      reflector.get.mockReturnValue(metadata);

      await lastValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      );
      await flushPromises();

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 'response-id',
        }),
      );
    });

    it('should extract entity ID from body when entityIdFromBody is set', async () => {
      const customRequest = {
        ...mockRequest,
        body: { productId: 'body-id' },
      };
      const customContext = createExecutionContext(customRequest);

      const metadata: AuditMetadata = {
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PRODUCT,
        entityIdFromBody: 'productId',
      };
      reflector.get.mockReturnValue(metadata);

      await lastValueFrom(
        interceptor.intercept(customContext, mockCallHandler),
      );
      await flushPromises();

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 'body-id',
        }),
      );
    });

    it('should handle bulk operations with succeeded array in response', async () => {
      const bulkResponse = {
        succeeded: ['id-1', 'id-2', 'id-3'],
        failures: [],
      };
      const bulkCallHandler: CallHandler = {
        handle: jest.fn().mockReturnValue(of(bulkResponse)),
      };

      const metadata: AuditMetadata = {
        action: AuditAction.DELETE,
        entityType: AuditEntityType.PRODUCT,
        entityIdFromResponse: 'succeeded',
      };
      reflector.get.mockReturnValue(metadata);

      await lastValueFrom(
        interceptor.intercept(mockExecutionContext, bulkCallHandler),
      );
      await flushPromises();

      expect(auditLogService.logBulk).toHaveBeenCalledWith({
        action: AuditAction.DELETE,
        entityType: AuditEntityType.PRODUCT,
        entityIds: ['id-1', 'id-2', 'id-3'],
        context: expect.any(Object),
      });
    });

    it('should not create audit log on error', async () => {
      const errorCallHandler: CallHandler = {
        handle: jest
          .fn()
          .mockReturnValue(throwError(() => new Error('Test error'))),
      };

      const metadata: AuditMetadata = {
        action: AuditAction.CREATE,
        entityType: AuditEntityType.PRODUCT,
        entityIdFromResponse: 'id',
      };
      reflector.get.mockReturnValue(metadata);

      await expect(
        lastValueFrom(
          interceptor.intercept(mockExecutionContext, errorCallHandler),
        ),
      ).rejects.toThrow('Test error');

      await flushPromises();

      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    it('should extract IP from request.ip', async () => {
      const metadata: AuditMetadata = {
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PRODUCT,
        entityIdParam: 'id',
      };
      reflector.get.mockReturnValue(metadata);

      await lastValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      );
      await flushPromises();

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            ipAddress: '192.168.1.1',
          }),
        }),
      );
    });

    it('should handle null IP when request.ip is undefined', async () => {
      const noIpRequest = {
        ...mockRequest,
        ip: undefined,
      };
      const noIpContext = createExecutionContext(noIpRequest);

      const metadata: AuditMetadata = {
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PRODUCT,
        entityIdParam: 'id',
      };
      reflector.get.mockReturnValue(metadata);

      await lastValueFrom(
        interceptor.intercept(noIpContext, mockCallHandler),
      );
      await flushPromises();

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            ipAddress: null,
          }),
        }),
      );
    });

    it('should handle null userId when no auth present', async () => {
      const noAuthRequest = {
        ...mockRequest,
        session: undefined,
      };
      const noAuthContext = createExecutionContext(noAuthRequest);

      const metadata: AuditMetadata = {
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PRODUCT,
        entityIdParam: 'id',
      };
      reflector.get.mockReturnValue(metadata);

      await lastValueFrom(
        interceptor.intercept(noAuthContext, mockCallHandler),
      );
      await flushPromises();

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            userId: null,
          }),
        }),
      );
    });

    it('should default to params.id when no entityId configuration', async () => {
      const metadata: AuditMetadata = {
        action: AuditAction.DELETE,
        entityType: AuditEntityType.PRODUCT,
      };
      reflector.get.mockReturnValue(metadata);

      await lastValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      );
      await flushPromises();

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 'entity-123',
        }),
      );
    });

    it('should handle nested path in entityIdFromResponse', async () => {
      const nestedResponse = { data: { entity: { id: 'nested-id' } } };
      const nestedCallHandler: CallHandler = {
        handle: jest.fn().mockReturnValue(of(nestedResponse)),
      };

      const metadata: AuditMetadata = {
        action: AuditAction.CREATE,
        entityType: AuditEntityType.PRODUCT,
        entityIdFromResponse: 'data.entity.id',
      };
      reflector.get.mockReturnValue(metadata);

      await lastValueFrom(
        interceptor.intercept(mockExecutionContext, nestedCallHandler),
      );
      await flushPromises();

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 'nested-id',
        }),
      );
    });

    it('should continue without error when audit log creation fails', async () => {
      auditLogService.log.mockRejectedValue(new Error('Database error'));

      const metadata: AuditMetadata = {
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PRODUCT,
        entityIdParam: 'id',
      };
      reflector.get.mockReturnValue(metadata);

      const result = await lastValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      );
      await flushPromises();

      // Response should still be returned even if audit logging fails
      expect(result).toEqual({ id: 'response-id', name: 'Test' });
    });
  });
});
