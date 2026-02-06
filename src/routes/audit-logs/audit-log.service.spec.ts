import { Test, type TestingModule } from '@nestjs/testing';
import { AuditAction, AuditEntityType } from 'src/common/enums';
import {
  AuditLogService,
  type AuditContext,
  type LogAuditParams,
} from './audit-log.service';
import { AuditLogRepository, type PaginatedAuditLogs } from './audit-log.repository';
import { type AuditLog } from './entities/audit-log.entity';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: jest.Mocked<AuditLogRepository>;

  const mockAuditContext: AuditContext = {
    userId: 'user_123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
  };

  const mockAuditLog: AuditLog = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    user_id: 'user_123',
    action: AuditAction.CREATE,
    entity_type: AuditEntityType.PRODUCT,
    entity_id: '660e8400-e29b-41d4-a716-446655440000',
    changes: null,
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    created_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      createMany: jest.fn(),
      findByEntityId: jest.fn(),
      findByUserId: jest.fn(),
      findPaginated: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: AuditLogRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    repository = module.get(AuditLogRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create an audit log entry', async () => {
      repository.create.mockResolvedValue(mockAuditLog);

      const params: LogAuditParams = {
        action: AuditAction.CREATE,
        entityType: AuditEntityType.PRODUCT,
        entityId: '660e8400-e29b-41d4-a716-446655440000',
        context: mockAuditContext,
      };

      const result = await service.log(params);

      expect(repository.create).toHaveBeenCalledWith({
        user_id: 'user_123',
        action: AuditAction.CREATE,
        entity_type: AuditEntityType.PRODUCT,
        entity_id: '660e8400-e29b-41d4-a716-446655440000',
        changes: null,
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
      });
      expect(result).toEqual(mockAuditLog);
    });

    it('should create an audit log with changes', async () => {
      const auditLogWithChanges = {
        ...mockAuditLog,
        action: AuditAction.UPDATE,
        changes: { before: { name: 'Old' }, after: { name: 'New' } },
      };
      repository.create.mockResolvedValue(auditLogWithChanges);

      const params: LogAuditParams = {
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PRODUCT,
        entityId: '660e8400-e29b-41d4-a716-446655440000',
        context: mockAuditContext,
        changes: { before: { name: 'Old' }, after: { name: 'New' } },
      };

      const result = await service.log(params);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: { before: { name: 'Old' }, after: { name: 'New' } },
        }),
      );
      expect(result.changes).toEqual({
        before: { name: 'Old' },
        after: { name: 'New' },
      });
    });

    it('should handle null userId', async () => {
      const auditLogWithNullUser = { ...mockAuditLog, user_id: null };
      repository.create.mockResolvedValue(auditLogWithNullUser);

      const params: LogAuditParams = {
        action: AuditAction.CREATE,
        entityType: AuditEntityType.PRODUCT,
        entityId: '660e8400-e29b-41d4-a716-446655440000',
        context: { ...mockAuditContext, userId: null },
      };

      await service.log(params);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: null }),
      );
    });

    it('should handle optional context fields', async () => {
      repository.create.mockResolvedValue({
        ...mockAuditLog,
        ip_address: null,
        user_agent: null,
      });

      const params: LogAuditParams = {
        action: AuditAction.CREATE,
        entityType: AuditEntityType.PRODUCT,
        entityId: '660e8400-e29b-41d4-a716-446655440000',
        context: { userId: 'user_123' },
      };

      await service.log(params);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: null,
          user_agent: null,
        }),
      );
    });

    it('should throw error when repository fails', async () => {
      repository.create.mockRejectedValue(new Error('Database error'));

      const params: LogAuditParams = {
        action: AuditAction.CREATE,
        entityType: AuditEntityType.PRODUCT,
        entityId: '660e8400-e29b-41d4-a716-446655440000',
        context: mockAuditContext,
      };

      await expect(service.log(params)).rejects.toThrow('Database error');
    });
  });

  describe('logBulk', () => {
    it('should create multiple audit log entries', async () => {
      const entityIds = ['id-1', 'id-2', 'id-3'];
      const mockAuditLogs = entityIds.map((id) => ({
        ...mockAuditLog,
        id: `audit-${id}`,
        entity_id: id,
      }));
      repository.createMany.mockResolvedValue(mockAuditLogs);

      const result = await service.logBulk({
        action: AuditAction.DELETE,
        entityType: AuditEntityType.PRODUCT,
        entityIds,
        context: mockAuditContext,
      });

      expect(repository.createMany).toHaveBeenCalledWith(
        entityIds.map((id) => ({
          user_id: 'user_123',
          action: AuditAction.DELETE,
          entity_type: AuditEntityType.PRODUCT,
          entity_id: id,
          changes: null,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
        })),
      );
      expect(result).toHaveLength(3);
    });

    it('should handle empty entityIds array', async () => {
      repository.createMany.mockResolvedValue([]);

      const result = await service.logBulk({
        action: AuditAction.DELETE,
        entityType: AuditEntityType.PRODUCT,
        entityIds: [],
        context: mockAuditContext,
      });

      expect(repository.createMany).toHaveBeenCalledWith([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getEntityHistory', () => {
    it('should return audit history for an entity', async () => {
      const auditLogs = [
        { ...mockAuditLog, action: AuditAction.CREATE },
        { ...mockAuditLog, id: 'audit-2', action: AuditAction.UPDATE },
      ];
      repository.findByEntityId.mockResolvedValue(auditLogs);

      const result = await service.getEntityHistory(
        AuditEntityType.PRODUCT,
        '660e8400-e29b-41d4-a716-446655440000',
      );

      expect(repository.findByEntityId).toHaveBeenCalledWith(
        AuditEntityType.PRODUCT,
        '660e8400-e29b-41d4-a716-446655440000',
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('getUserHistory', () => {
    it('should return audit history for a user', async () => {
      const auditLogs = [mockAuditLog];
      repository.findByUserId.mockResolvedValue(auditLogs);

      const result = await service.getUserHistory('user_123');

      expect(repository.findByUserId).toHaveBeenCalledWith('user_123');
      expect(result).toHaveLength(1);
    });
  });

  describe('query', () => {
    it('should return paginated audit logs', async () => {
      const paginatedResult: PaginatedAuditLogs = {
        data: [mockAuditLog],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      };
      repository.findPaginated.mockResolvedValue(paginatedResult);

      const result = await service.query({
        entity_type: AuditEntityType.PRODUCT,
        page: 1,
        limit: 20,
      });

      expect(repository.findPaginated).toHaveBeenCalledWith({
        entity_type: AuditEntityType.PRODUCT,
        page: 1,
        limit: 20,
      });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should pass all query options to repository', async () => {
      const paginatedResult: PaginatedAuditLogs = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 0,
      };
      repository.findPaginated.mockResolvedValue(paginatedResult);

      const queryOptions = {
        entity_type: AuditEntityType.PRODUCT,
        entity_id: 'entity-123',
        user_id: 'user-123',
        action: AuditAction.UPDATE,
        from_date: new Date('2024-01-01'),
        to_date: new Date('2024-12-31'),
        page: 2,
        limit: 50,
      };

      await service.query(queryOptions);

      expect(repository.findPaginated).toHaveBeenCalledWith(queryOptions);
    });
  });

  describe('findById', () => {
    it('should return audit log by id', async () => {
      repository.findById.mockResolvedValue(mockAuditLog);

      const result = await service.findById(mockAuditLog.id);

      expect(repository.findById).toHaveBeenCalledWith(mockAuditLog.id);
      expect(result).toEqual(mockAuditLog);
    });

    it('should return null when audit log not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('computeChanges', () => {
    it('should compute changes between before and after states', () => {
      const before = { name: 'Old Name', price: 100, description: 'Same' };
      const after = { name: 'New Name', price: 150, description: 'Same' };

      const result = service.computeChanges(before, after);

      expect(result).toEqual({
        before: { name: 'Old Name', price: 100 },
        after: { name: 'New Name', price: 150 },
      });
    });

    it('should return after state when before is null (create)', () => {
      const after = { name: 'New Product', price: 100 };

      const result = service.computeChanges(null, after);

      expect(result).toEqual({
        after: { name: 'New Product', price: 100 },
      });
    });

    it('should return before state when after is null (delete)', () => {
      const before = { name: 'Deleted Product', price: 100 };

      const result = service.computeChanges(before, null);

      expect(result).toEqual({
        before: { name: 'Deleted Product', price: 100 },
      });
    });

    it('should return null when both are null', () => {
      const result = service.computeChanges(null, null);

      expect(result).toBeNull();
    });

    it('should return null when no changes detected', () => {
      const before = { name: 'Same', price: 100 };
      const after = { name: 'Same', price: 100 };

      const result = service.computeChanges(before, after);

      expect(result).toBeNull();
    });

    it('should track only specified fields when fieldsToTrack is provided', () => {
      const before = { name: 'Old', price: 100, description: 'Old Desc' };
      const after = { name: 'New', price: 150, description: 'New Desc' };

      const result = service.computeChanges(before, after, ['name', 'price']);

      expect(result).toEqual({
        before: { name: 'Old', price: 100 },
        after: { name: 'New', price: 150 },
      });
    });

    it('should handle nested objects using JSON comparison', () => {
      const before = { config: { enabled: true, count: 5 } };
      const after = { config: { enabled: false, count: 5 } };

      const result = service.computeChanges(before, after);

      expect(result).toEqual({
        before: { config: { enabled: true, count: 5 } },
        after: { config: { enabled: false, count: 5 } },
      });
    });

    it('should handle arrays using JSON comparison', () => {
      const before = { tags: ['a', 'b'] };
      const after = { tags: ['a', 'b', 'c'] };

      const result = service.computeChanges(before, after);

      expect(result).toEqual({
        before: { tags: ['a', 'b'] },
        after: { tags: ['a', 'b', 'c'] },
      });
    });
  });
});
