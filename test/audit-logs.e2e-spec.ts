import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { AppModule } from '../src/app.module';
import { AuditLog } from '../src/routes/audit-logs/entities/audit-log.entity';
import { AuditAction, AuditEntityType } from '../src/common/enums';

describe('AuditLogsController (e2e)', () => {
  let app: INestApplication;
  let auditLogRepository: Repository<AuditLog>;
  let authToken: string;

  const mockAuthGuard = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.session = {
        user: { id: 'test-user-id', role: 'admin' },
        session: { id: 'test-session-id' },
      };
      return true;
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health-check'] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    auditLogRepository = moduleFixture.get(getRepositoryToken(AuditLog));
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await auditLogRepository.query('DELETE FROM audit_logs');
  });

  const createTestAuditLog = async (overrides: Partial<AuditLog> = {}) => {
    return auditLogRepository.save({
      user_id: 'test-user-id',
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.PRODUCT,
      entity_id: '550e8400-e29b-41d4-a716-446655440000',
      changes: null,
      ip_address: '127.0.0.1',
      user_agent: 'test-agent',
      ...overrides,
    });
  };

  describe('GET /api/v1/audit-logs', () => {
    it('should return empty paginated response when no logs exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
      expect(response.body.meta.page).toBe(1);
    });

    it('should return paginated audit logs', async () => {
      await createTestAuditLog();
      await createTestAuditLog({
        action: AuditAction.UPDATE,
        entity_id: '660e8400-e29b-41d4-a716-446655440000',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(2);
      expect(response.body.meta.has_next).toBe(false);
      expect(response.body.meta.has_previous).toBe(false);
    });

    it('should filter by action', async () => {
      await createTestAuditLog({ action: AuditAction.CREATE });
      await createTestAuditLog({
        action: AuditAction.DELETE,
        entity_id: '660e8400-e29b-41d4-a716-446655440000',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .query({ action: AuditAction.CREATE })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].action).toBe(AuditAction.CREATE);
    });

    it('should filter by entity_type', async () => {
      await createTestAuditLog({ entity_type: AuditEntityType.PRODUCT });
      await createTestAuditLog({
        entity_type: AuditEntityType.CATEGORY,
        entity_id: '660e8400-e29b-41d4-a716-446655440000',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .query({ entity_type: AuditEntityType.CATEGORY })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].entity_type).toBe(AuditEntityType.CATEGORY);
    });

    it('should filter by both action and entity_type', async () => {
      await createTestAuditLog({
        action: AuditAction.CREATE,
        entity_type: AuditEntityType.PRODUCT,
      });
      await createTestAuditLog({
        action: AuditAction.UPDATE,
        entity_type: AuditEntityType.PRODUCT,
        entity_id: '660e8400-e29b-41d4-a716-446655440000',
      });
      await createTestAuditLog({
        action: AuditAction.CREATE,
        entity_type: AuditEntityType.CATEGORY,
        entity_id: '770e8400-e29b-41d4-a716-446655440000',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .query({
          action: AuditAction.CREATE,
          entity_type: AuditEntityType.PRODUCT,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].action).toBe(AuditAction.CREATE);
      expect(response.body.data[0].entity_type).toBe(AuditEntityType.PRODUCT);
    });

    it('should paginate results', async () => {
      // Create 5 logs
      for (let i = 0; i < 5; i++) {
        await createTestAuditLog({
          entity_id: `550e8400-e29b-41d4-a716-44665544000${i}`,
        });
      }

      const page1 = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page1.body.data).toHaveLength(2);
      expect(page1.body.meta.total).toBe(5);
      expect(page1.body.meta.total_pages).toBe(3);
      expect(page1.body.meta.has_next).toBe(true);
      expect(page1.body.meta.has_previous).toBe(false);

      const page2 = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .query({ page: 2, limit: 2 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page2.body.data).toHaveLength(2);
      expect(page2.body.meta.has_next).toBe(true);
      expect(page2.body.meta.has_previous).toBe(true);

      const page3 = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .query({ page: 3, limit: 2 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page3.body.data).toHaveLength(1);
      expect(page3.body.meta.has_next).toBe(false);
      expect(page3.body.meta.has_previous).toBe(true);
    });

    it('should return logs ordered by created_at descending', async () => {
      const older = await createTestAuditLog({
        entity_id: '550e8400-e29b-41d4-a716-446655440001',
      });
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
      const newer = await createTestAuditLog({
        entity_id: '550e8400-e29b-41d4-a716-446655440002',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data[0].id).toBe(newer.id);
      expect(response.body.data[1].id).toBe(older.id);
    });
  });

  describe('GET /api/v1/audit-logs/:id', () => {
    it('should return a single audit log by id', async () => {
      const auditLog = await createTestAuditLog();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/audit-logs/${auditLog.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(auditLog.id);
      expect(response.body.action).toBe(AuditAction.CREATE);
      expect(response.body.entity_type).toBe(AuditEntityType.PRODUCT);
    });

    it('should return 404 for non-existent audit log', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/audit-logs/550e8400-e29b-41d4-a716-446655440099')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/audit-logs/not-a-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /api/v1/audit-logs/entity/:entityType/:entityId', () => {
    it('should return audit history for an entity', async () => {
      const entityId = '550e8400-e29b-41d4-a716-446655440000';
      await createTestAuditLog({
        action: AuditAction.CREATE,
        entity_type: AuditEntityType.PRODUCT,
        entity_id: entityId,
      });
      await createTestAuditLog({
        action: AuditAction.UPDATE,
        entity_type: AuditEntityType.PRODUCT,
        entity_id: entityId,
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/audit-logs/entity/PRODUCT/${entityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('should return empty array for entity with no history', async () => {
      const response = await request(app.getHttpServer())
        .get(
          '/api/v1/audit-logs/entity/PRODUCT/550e8400-e29b-41d4-a716-446655440099',
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/v1/audit-logs/user/:userId', () => {
    it('should return audit history for a user', async () => {
      await createTestAuditLog({ user_id: 'specific-user-id' });
      await createTestAuditLog({
        user_id: 'specific-user-id',
        entity_id: '660e8400-e29b-41d4-a716-446655440000',
      });
      await createTestAuditLog({ user_id: 'other-user-id' });

      const response = await request(app.getHttpServer())
        .get('/api/v1/audit-logs/user/specific-user-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(
        response.body.every(
          (log: AuditLog) => log.user_id === 'specific-user-id',
        ),
      ).toBe(true);
    });

    it('should return empty array for user with no history', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/audit-logs/user/non-existent-user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('Authorization', () => {
    it('should return 403 when not authorized', async () => {
      mockAuthGuard.canActivate.mockReturnValueOnce(false);

      await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .expect(403);
    });
  });
});
