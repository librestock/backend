import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AuditAction, AuditEntityType } from 'src/common/enums';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogService } from './audit-log.service';
import { type AuditLog } from './entities/audit-log.entity';
import { type PaginatedAuditLogs } from './audit-log.repository';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let service: jest.Mocked<AuditLogService>;

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
    const mockService = {
      query: jest.fn(),
      findById: jest.fn(),
      getEntityHistory: jest.fn(),
      getUserHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        {
          provide: AuditLogService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
    service = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      const paginatedResult: PaginatedAuditLogs = {
        data: [mockAuditLog],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      };
      service.query.mockResolvedValue(paginatedResult);

      const result = await controller.listAuditLogs({
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.has_next).toBe(false);
      expect(result.meta.has_previous).toBe(false);
    });

    it('should correctly calculate has_next and has_previous', async () => {
      const paginatedResult: PaginatedAuditLogs = {
        data: [mockAuditLog],
        total: 100,
        page: 2,
        limit: 20,
        total_pages: 5,
      };
      service.query.mockResolvedValue(paginatedResult);

      const result = await controller.listAuditLogs({
        page: 2,
        limit: 20,
      });

      expect(result.meta.has_next).toBe(true);
      expect(result.meta.has_previous).toBe(true);
    });

    it('should pass all query filters to service', async () => {
      const paginatedResult: PaginatedAuditLogs = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 0,
      };
      service.query.mockResolvedValue(paginatedResult);

      await controller.listAuditLogs({
        entity_type: AuditEntityType.PRODUCT,
        entity_id: 'entity-123',
        user_id: 'user-123',
        action: AuditAction.UPDATE,
        from_date: '2024-01-01T00:00:00Z',
        to_date: '2024-12-31T23:59:59Z',
        page: 1,
        limit: 50,
      });

      expect(service.query).toHaveBeenCalledWith({
        entity_type: AuditEntityType.PRODUCT,
        entity_id: 'entity-123',
        user_id: 'user-123',
        action: AuditAction.UPDATE,
        from_date: new Date('2024-01-01T00:00:00Z'),
        to_date: new Date('2024-12-31T23:59:59Z'),
        page: 1,
        limit: 50,
      });
    });

    it('should handle empty filters', async () => {
      const paginatedResult: PaginatedAuditLogs = {
        data: [mockAuditLog],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      };
      service.query.mockResolvedValue(paginatedResult);

      await controller.listAuditLogs({});

      expect(service.query).toHaveBeenCalledWith({
        entity_type: undefined,
        entity_id: undefined,
        user_id: undefined,
        action: undefined,
        from_date: undefined,
        to_date: undefined,
        page: undefined,
        limit: undefined,
      });
    });
  });

  describe('getAuditLog', () => {
    it('should return audit log by id', async () => {
      service.findById.mockResolvedValue(mockAuditLog);

      const result = await controller.getAuditLog(mockAuditLog.id);

      expect(service.findById).toHaveBeenCalledWith(mockAuditLog.id);
      expect(result).toEqual(mockAuditLog);
    });

    it('should throw NotFoundException when audit log not found', async () => {
      service.findById.mockResolvedValue(null);

      await expect(controller.getAuditLog('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getAuditLog('non-existent-id')).rejects.toThrow(
        'Audit log with ID non-existent-id not found',
      );
    });
  });

  describe('getEntityAuditHistory', () => {
    it('should return audit history for an entity', async () => {
      const auditLogs = [
        { ...mockAuditLog, action: AuditAction.CREATE },
        { ...mockAuditLog, id: 'audit-2', action: AuditAction.UPDATE },
        { ...mockAuditLog, id: 'audit-3', action: AuditAction.DELETE },
      ];
      service.getEntityHistory.mockResolvedValue(auditLogs);

      const result = await controller.getEntityAuditHistory(
        AuditEntityType.PRODUCT,
        '660e8400-e29b-41d4-a716-446655440000',
      );

      expect(service.getEntityHistory).toHaveBeenCalledWith(
        AuditEntityType.PRODUCT,
        '660e8400-e29b-41d4-a716-446655440000',
      );
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no history found', async () => {
      service.getEntityHistory.mockResolvedValue([]);

      const result = await controller.getEntityAuditHistory(
        AuditEntityType.CATEGORY,
        'non-existent-entity',
      );

      expect(result).toEqual([]);
    });

    it('should work with all entity types', async () => {
      service.getEntityHistory.mockResolvedValue([mockAuditLog]);

      for (const entityType of Object.values(AuditEntityType)) {
        await controller.getEntityAuditHistory(entityType, 'entity-id');
        expect(service.getEntityHistory).toHaveBeenCalledWith(
          entityType,
          'entity-id',
        );
      }
    });
  });

  describe('getUserAuditHistory', () => {
    it('should return audit history for a user', async () => {
      const auditLogs = [
        { ...mockAuditLog, entity_type: AuditEntityType.PRODUCT },
        {
          ...mockAuditLog,
          id: 'audit-2',
          entity_type: AuditEntityType.CATEGORY,
        },
      ];
      service.getUserHistory.mockResolvedValue(auditLogs);

      const result = await controller.getUserAuditHistory('user_123');

      expect(service.getUserHistory).toHaveBeenCalledWith('user_123');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no history found for user', async () => {
      service.getUserHistory.mockResolvedValue([]);

      const result = await controller.getUserAuditHistory('unknown-user');

      expect(result).toEqual([]);
    });
  });
});
