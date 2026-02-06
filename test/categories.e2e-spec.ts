import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { AppModule } from '../src/app.module';
import { Category } from '../src/routes/categories/entities/category.entity';

describe('CategoriesController (e2e)', () => {
  let app: INestApplication;
  let categoryRepository: Repository<Category>;
  let authToken: string;

  const mockAuthGuard = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.session = {
        user: { id: 'test-user-id' },
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

    categoryRepository = moduleFixture.get(getRepositoryToken(Category));
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await categoryRepository.query('DELETE FROM products');
    await categoryRepository.query('DELETE FROM categories');
  });

  describe('GET /api/v1/categories', () => {
    it('should return empty array when no categories exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return hierarchical tree of categories', async () => {
      const parentCategory = await categoryRepository.save({
        name: 'Electronics',
        description: 'Electronic products',
      });

      await categoryRepository.save({
        name: 'Smartphones',
        parent_id: parentCategory.id,
        description: 'Mobile phones',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Electronics');
      expect(response.body[0].children).toHaveLength(1);
      expect(response.body[0].children[0].name).toBe('Smartphones');
    });

    it('should return 401 without authorization', async () => {
      mockAuthGuard.canActivate.mockReturnValueOnce(false);

      await request(app.getHttpServer()).get('/api/v1/categories').expect(403);
    });
  });

  describe('POST /api/v1/categories', () => {
    it('should create a root category', async () => {
      const createDto = {
        name: 'Electronics',
        description: 'Electronic products',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body.name).toBe('Electronics');
      expect(response.body.parent_id).toBeNull();
      expect(response.body.id).toBeDefined();
    });

    it('should create a child category', async () => {
      const parentCategory = await categoryRepository.save({
        name: 'Electronics',
      });

      const createDto = {
        name: 'Smartphones',
        parent_id: parentCategory.id,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body.name).toBe('Smartphones');
      expect(response.body.parent_id).toBe(parentCategory.id);
    });

    it('should return 400 when parent does not exist', async () => {
      const createDto = {
        name: 'Smartphones',
        parent_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(400);

      expect(response.body.message).toBe('Parent category not found');
    });

    it('should return 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should return 400 when name is too long', async () => {
      const createDto = {
        name: 'A'.repeat(101),
      };

      await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(400);
    });

    it('should return 400 when parent_id is not a valid UUID', async () => {
      const createDto = {
        name: 'Smartphones',
        parent_id: 'not-a-uuid',
      };

      await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(400);
    });
  });

  describe('PUT /api/v1/categories/:id', () => {
    it('should update category name', async () => {
      const category = await categoryRepository.save({
        name: 'Electronics',
      });

      const updateDto = { name: 'Updated Electronics' };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/categories/${category.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe('Updated Electronics');
    });

    it('should update category parent', async () => {
      const parent = await categoryRepository.save({ name: 'Parent' });
      const child = await categoryRepository.save({ name: 'Child' });

      const updateDto = { parent_id: parent.id };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/categories/${child.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.parent_id).toBe(parent.id);
    });

    it('should return 404 when category does not exist', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/categories/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body.message).toBe('Category not found');
    });

    it('should return 400 when setting parent to itself', async () => {
      const category = await categoryRepository.save({ name: 'Test' });

      const response = await request(app.getHttpServer())
        .put(`/api/v1/categories/${category.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parent_id: category.id })
        .expect(400);

      expect(response.body.message).toBe('Category cannot be its own parent');
    });

    it('should return 400 when update would create circular reference', async () => {
      const parent = await categoryRepository.save({ name: 'Parent' });
      const child = await categoryRepository.save({
        name: 'Child',
        parent_id: parent.id,
      });
      const grandchild = await categoryRepository.save({
        name: 'Grandchild',
        parent_id: child.id,
      });

      const response = await request(app.getHttpServer())
        .put(`/api/v1/categories/${parent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parent_id: grandchild.id })
        .expect(400);

      expect(response.body.message).toBe(
        'Cannot set parent: would create a circular reference',
      );
    });

    it('should allow removing parent (make root)', async () => {
      const parent = await categoryRepository.save({ name: 'Parent' });
      const child = await categoryRepository.save({
        name: 'Child',
        parent_id: parent.id,
      });

      const response = await request(app.getHttpServer())
        .put(`/api/v1/categories/${child.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parent_id: null })
        .expect(200);

      expect(response.body.parent_id).toBeNull();
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/categories/not-a-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/categories/:id', () => {
    it('should delete category', async () => {
      const category = await categoryRepository.save({ name: 'Test' });

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/categories/${category.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Category deleted successfully');

      const deleted = await categoryRepository.findOneBy({ id: category.id });
      expect(deleted).toBeNull();
    });

    it('should return 404 when category does not exist', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/categories/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toBe('Category not found');
    });

    it('should orphan children when parent is deleted', async () => {
      const parent = await categoryRepository.save({ name: 'Parent' });
      const child = await categoryRepository.save({
        name: 'Child',
        parent_id: parent.id,
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/categories/${parent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const updatedChild = await categoryRepository.findOneBy({ id: child.id });
      expect(updatedChild?.parent_id).toBeNull();
    });
  });
});
