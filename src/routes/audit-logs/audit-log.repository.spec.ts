import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditAction, AuditEntityType } from 'src/common/enums';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogRepository } from './audit-log.repository';

describe('AuditLogRepository', () => {
  let repository: AuditLogRepository;
  let typeormRepository: Record<string, jest.Mock>;

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

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    typeormRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogRepository,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: typeormRepository,
        },
      ],
    }).compile();

    repository = module.get<AuditLogRepository>(AuditLogRepository);

    jest.clearAllMocks();
    // Reset query builder mocks after clearAllMocks
    mockQueryBuilder.andWhere.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.skip.mockReturnThis();
    mockQueryBuilder.take.mockReturnThis();
    typeormRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create and save an audit log', async () => {
      typeormRepository.create.mockReturnValue(mockAuditLog);
      typeormRepository.save.mockResolvedValue(mockAuditLog);

      const data = {
        user_id: 'user_123',
        action: AuditAction.CREATE,
        entity_type: AuditEntityType.PRODUCT,
        entity_id: '660e8400-e29b-41d4-a716-446655440000',
      };

      const result = await repository.create(data);

      expect(typeormRepository.create).toHaveBeenCalledWith(data);
      expect(typeormRepository.save).toHaveBeenCalledWith(mockAuditLog);
      expect(result).toEqual(mockAuditLog);
    });
  });

  describe('createMany', () => {
    it('should create and save multiple audit logs', async () => {
      const dataArray = [
        {
          user_id: 'user_123',
          action: AuditAction.DELETE,
          entity_type: AuditEntityType.PRODUCT,
          entity_id: 'id-1',
        },
        {
          user_id: 'user_123',
          action: AuditAction.DELETE,
          entity_type: AuditEntityType.PRODUCT,
          entity_id: 'id-2',
        },
      ];
      const mockLogs = dataArray.map((d, i) => ({
        ...mockAuditLog,
        id: `id-${i}`,
        ...d,
      }));

      typeormRepository.create.mockReturnValue(mockLogs);
      typeormRepository.save.mockResolvedValue(mockLogs);

      const result = await repository.createMany(dataArray);

      expect(typeormRepository.create).toHaveBeenCalledWith(dataArray);
      expect(typeormRepository.save).toHaveBeenCalledWith(mockLogs);
      expect(result).toHaveLength(2);
    });
  });

  describe('findByEntityId', () => {
    it('should find logs by entity type and id', async () => {
      const logs = [mockAuditLog];
      typeormRepository.find.mockResolvedValue(logs);

      const result = await repository.findByEntityId(
        AuditEntityType.PRODUCT,
        '660e8400-e29b-41d4-a716-446655440000',
      );

      expect(typeormRepository.find).toHaveBeenCalledWith({
        where: {
          entity_type: AuditEntityType.PRODUCT,
          entity_id: '660e8400-e29b-41d4-a716-446655440000',
        },
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual(logs);
    });
  });

  describe('findByUserId', () => {
    it('should find logs by user id', async () => {
      const logs = [mockAuditLog];
      typeormRepository.find.mockResolvedValue(logs);

      const result = await repository.findByUserId('user_123');

      expect(typeormRepository.find).toHaveBeenCalledWith({
        where: { user_id: 'user_123' },
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual(logs);
    });
  });

  describe('findPaginated', () => {
    it('should return paginated results with defaults', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockAuditLog]);

      const result = await repository.findPaginated({});

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'audit_log.created_at',
        'DESC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(result).toEqual({
        data: [mockAuditLog],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      });
    });

    it('should apply entity_type filter', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await repository.findPaginated({
        entity_type: AuditEntityType.CATEGORY,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.entity_type = :entity_type',
        { entity_type: AuditEntityType.CATEGORY },
      );
    });

    it('should apply action filter', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await repository.findPaginated({
        action: AuditAction.UPDATE,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.action = :action',
        { action: AuditAction.UPDATE },
      );
    });

    it('should apply entity_id filter', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await repository.findPaginated({
        entity_id: 'entity-123',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.entity_id = :entity_id',
        { entity_id: 'entity-123' },
      );
    });

    it('should apply user_id filter', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await repository.findPaginated({
        user_id: 'user-123',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.user_id = :user_id',
        { user_id: 'user-123' },
      );
    });

    it('should apply date range filters', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');

      await repository.findPaginated({
        from_date: fromDate,
        to_date: toDate,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.created_at >= :from_date',
        { from_date: fromDate },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.created_at <= :to_date',
        { to_date: toDate },
      );
    });

    it('should apply all filters simultaneously', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await repository.findPaginated({
        entity_type: AuditEntityType.PRODUCT,
        entity_id: 'entity-123',
        user_id: 'user-123',
        action: AuditAction.UPDATE,
        from_date: new Date('2024-01-01'),
        to_date: new Date('2024-12-31'),
        page: 2,
        limit: 50,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(6);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(50);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
    });

    it('should calculate correct pagination offset', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(100);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await repository.findPaginated({
        page: 3,
        limit: 10,
      });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.total_pages).toBe(10);
    });
  });

  describe('findById', () => {
    it('should find audit log by id', async () => {
      typeormRepository.findOneBy.mockResolvedValue(mockAuditLog);

      const result = await repository.findById(mockAuditLog.id);

      expect(typeormRepository.findOneBy).toHaveBeenCalledWith({
        id: mockAuditLog.id,
      });
      expect(result).toEqual(mockAuditLog);
    });

    it('should return null when not found', async () => {
      typeormRepository.findOneBy.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });
});
