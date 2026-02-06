import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { AppModule } from '../src/app.module';
import { Product } from '../src/routes/products/entities/product.entity';
import { Category } from '../src/routes/categories/entities/category.entity';

describe('ProductsController (e2e)', () => {
  let app: INestApplication;
  let productRepository: Repository<Product>;
  let categoryRepository: Repository<Category>;
  let authToken: string;
  let testCategory: Category;

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

    productRepository = moduleFixture.get(getRepositoryToken(Product));
    categoryRepository = moduleFixture.get(getRepositoryToken(Category));
    authToken = 'test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await productRepository.query('DELETE FROM products');
    await categoryRepository.query('DELETE FROM categories');

    testCategory = await categoryRepository.save({
      name: 'Test Category',
      description: 'Test description',
    });
  });

  const createTestProduct = async (overrides = {}) => {
    return productRepository.save({
      sku: 'TEST-SKU-001',
      name: 'Test Product',
      category_id: testCategory.id,
      reorder_point: 10,
      is_active: true,
      is_perishable: false,
      ...overrides,
    });
  };

  describe('GET /api/v1/products', () => {
    it('should return empty paginated response when no products exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
      expect(response.body.meta.page).toBe(1);
    });

    it('should return paginated products', async () => {
      await createTestProduct();

      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].sku).toBe('TEST-SKU-001');
      expect(response.body.meta.total).toBe(1);
    });

    it('should filter products by search', async () => {
      await createTestProduct({ sku: 'MATCH-001', name: 'Match Product' });
      await createTestProduct({ sku: 'OTHER-001', name: 'Other Product' });

      const response = await request(app.getHttpServer())
        .get('/api/v1/products?search=MATCH')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].sku).toBe('MATCH-001');
    });

    it('should filter products by category', async () => {
      const anotherCategory = await categoryRepository.save({
        name: 'Another Category',
      });
      await createTestProduct({ sku: 'CAT1-001' });
      await createTestProduct({
        sku: 'CAT2-001',
        category_id: anotherCategory.id,
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/products?category_id=${testCategory.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].sku).toBe('CAT1-001');
    });

    it('should filter products by is_active', async () => {
      await createTestProduct({ sku: 'ACTIVE-001', is_active: true });
      await createTestProduct({ sku: 'INACTIVE-001', is_active: false });

      const response = await request(app.getHttpServer())
        .get('/api/v1/products?is_active=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].sku).toBe('ACTIVE-001');
    });

    it('should filter products by price range', async () => {
      await createTestProduct({ sku: 'CHEAP-001', standard_price: 50 });
      await createTestProduct({ sku: 'EXPENSIVE-001', standard_price: 200 });

      const response = await request(app.getHttpServer())
        .get('/api/v1/products?min_price=100&max_price=300')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].sku).toBe('EXPENSIVE-001');
    });

    it('should not include soft-deleted products by default', async () => {
      await createTestProduct({ sku: 'ACTIVE-001' });
      await createTestProduct({
        sku: 'DELETED-001',
        deleted_at: new Date(),
        deleted_by: 'user',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].sku).toBe('ACTIVE-001');
    });

    it('should include soft-deleted products when include_deleted=true', async () => {
      await createTestProduct({ sku: 'ACTIVE-001' });
      await createTestProduct({
        sku: 'DELETED-001',
        deleted_at: new Date(),
        deleted_by: 'user',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/products?include_deleted=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
    });

    it('should sort products by name ascending by default', async () => {
      await createTestProduct({ sku: 'A-001', name: 'Zebra Product' });
      await createTestProduct({ sku: 'B-001', name: 'Apple Product' });

      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data[0].name).toBe('Apple Product');
      expect(response.body.data[1].name).toBe('Zebra Product');
    });

    it('should paginate results correctly', async () => {
      for (let i = 0; i < 25; i++) {
        await createTestProduct({
          sku: `SKU-${i.toString().padStart(3, '0')}`,
        });
      }

      const response = await request(app.getHttpServer())
        .get('/api/v1/products?page=2&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.meta.page).toBe(2);
      expect(response.body.meta.total).toBe(25);
      expect(response.body.meta.total_pages).toBe(3);
      expect(response.body.meta.has_previous).toBe(true);
      expect(response.body.meta.has_next).toBe(true);
    });
  });

  describe('GET /api/v1/products/all', () => {
    it('should return all products without pagination', async () => {
      for (let i = 0; i < 30; i++) {
        await createTestProduct({
          sku: `SKU-${i.toString().padStart(3, '0')}`,
        });
      }

      const response = await request(app.getHttpServer())
        .get('/api/v1/products/all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(30);
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('should return product by id', async () => {
      const product = await createTestProduct();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${product.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(product.id);
      expect(response.body.sku).toBe('TEST-SKU-001');
    });

    it('should return 404 when product does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toBe('Product not found');
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/products/not-a-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /api/v1/products/category/:categoryId', () => {
    it('should return products by category', async () => {
      await createTestProduct({ sku: 'CAT-001' });
      await createTestProduct({ sku: 'CAT-002' });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/category/${testCategory.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('should return 404 when category does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products/category/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toBe('Category not found');
    });
  });

  describe('GET /api/v1/products/category/:categoryId/tree', () => {
    it('should return products from category and descendants', async () => {
      const childCategory = await categoryRepository.save({
        name: 'Child Category',
        parent_id: testCategory.id,
      });

      await createTestProduct({ sku: 'PARENT-001' });
      await createTestProduct({
        sku: 'CHILD-001',
        category_id: childCategory.id,
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/category/${testCategory.id}/tree`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });
  });

  describe('POST /api/v1/products', () => {
    it('should create a product', async () => {
      const createDto = {
        sku: 'NEW-SKU-001',
        name: 'New Product',
        category_id: testCategory.id,
        reorder_point: 10,
        is_active: true,
        is_perishable: false,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body.sku).toBe('NEW-SKU-001');
      expect(response.body.name).toBe('New Product');
      expect(response.body.id).toBeDefined();
    });

    it('should return 400 when category does not exist', async () => {
      const createDto = {
        sku: 'NEW-SKU-001',
        name: 'New Product',
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        reorder_point: 10,
        is_active: true,
        is_perishable: false,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(400);

      expect(response.body.message).toBe('Category not found');
    });

    it('should return 400 when SKU already exists', async () => {
      await createTestProduct({ sku: 'EXISTING-SKU' });

      const createDto = {
        sku: 'EXISTING-SKU',
        name: 'New Product',
        category_id: testCategory.id,
        reorder_point: 10,
        is_active: true,
        is_perishable: false,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(400);

      expect(response.body.message).toBe(
        'A product with this SKU already exists',
      );
    });

    it('should return 400 when price is less than cost', async () => {
      const createDto = {
        sku: 'NEW-SKU-001',
        name: 'New Product',
        category_id: testCategory.id,
        standard_cost: 100,
        standard_price: 50,
        reorder_point: 10,
        is_active: true,
        is_perishable: false,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(400);

      expect(response.body.message).toBe(
        'Standard price must be greater than or equal to standard cost',
      );
    });

    it('should return 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should validate dimensions format', async () => {
      const createDto = {
        sku: 'NEW-SKU-001',
        name: 'New Product',
        category_id: testCategory.id,
        dimensions_cm: 'invalid-format',
        reorder_point: 10,
        is_active: true,
        is_perishable: false,
      };

      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(400);
    });
  });

  describe('POST /api/v1/products/bulk', () => {
    it('should create multiple products', async () => {
      const bulkDto = {
        products: [
          {
            sku: 'BULK-001',
            name: 'Bulk Product 1',
            category_id: testCategory.id,
            reorder_point: 10,
            is_active: true,
            is_perishable: false,
          },
          {
            sku: 'BULK-002',
            name: 'Bulk Product 2',
            category_id: testCategory.id,
            reorder_point: 5,
            is_active: true,
            is_perishable: false,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/products/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkDto)
        .expect(201);

      expect(response.body.success_count).toBe(2);
      expect(response.body.failure_count).toBe(0);
    });

    it('should handle partial failures', async () => {
      await createTestProduct({ sku: 'EXISTING-SKU' });

      const bulkDto = {
        products: [
          {
            sku: 'EXISTING-SKU',
            name: 'Duplicate',
            category_id: testCategory.id,
            reorder_point: 10,
            is_active: true,
            is_perishable: false,
          },
          {
            sku: 'NEW-SKU',
            name: 'New',
            category_id: testCategory.id,
            reorder_point: 10,
            is_active: true,
            is_perishable: false,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/products/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkDto)
        .expect(201);

      expect(response.body.success_count).toBe(1);
      expect(response.body.failure_count).toBe(1);
    });
  });

  describe('PUT /api/v1/products/:id', () => {
    it('should update product', async () => {
      const product = await createTestProduct();

      const updateDto = { name: 'Updated Product' };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/products/${product.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe('Updated Product');
    });

    it('should return 404 when product does not exist', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/products/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('should return 400 when updating to existing SKU', async () => {
      await createTestProduct({ sku: 'EXISTING-SKU' });
      const product = await createTestProduct({ sku: 'MY-SKU' });

      const response = await request(app.getHttpServer())
        .put(`/api/v1/products/${product.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sku: 'EXISTING-SKU' })
        .expect(400);

      expect(response.body.message).toBe(
        'A product with this SKU already exists',
      );
    });
  });

  describe('PATCH /api/v1/products/bulk/status', () => {
    it('should update status for multiple products', async () => {
      const product1 = await createTestProduct({ sku: 'P1', is_active: true });
      const product2 = await createTestProduct({ sku: 'P2', is_active: true });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/products/bulk/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ids: [product1.id, product2.id], is_active: false })
        .expect(200);

      expect(response.body.success_count).toBe(2);

      const updated1 = await productRepository.findOneBy({ id: product1.id });
      const updated2 = await productRepository.findOneBy({ id: product2.id });
      expect(updated1?.is_active).toBe(false);
      expect(updated2?.is_active).toBe(false);
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    it('should soft delete product by default', async () => {
      const product = await createTestProduct();

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/products/${product.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Product deleted successfully');

      const deleted = await productRepository.findOne({
        where: { id: product.id },
        withDeleted: true,
      });
      expect(deleted?.deleted_at).not.toBeNull();
    });

    it('should hard delete when permanent=true', async () => {
      const product = await createTestProduct();

      await request(app.getHttpServer())
        .delete(`/api/v1/products/${product.id}?permanent=true`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deleted = await productRepository.findOne({
        where: { id: product.id },
        withDeleted: true,
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 when product does not exist', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/products/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('DELETE /api/v1/products/bulk', () => {
    it('should soft delete multiple products', async () => {
      const product1 = await createTestProduct({ sku: 'P1' });
      const product2 = await createTestProduct({ sku: 'P2' });

      const response = await request(app.getHttpServer())
        .delete('/api/v1/products/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ids: [product1.id, product2.id] })
        .expect(200);

      expect(response.body.success_count).toBe(2);
    });

    it('should handle non-existent products', async () => {
      const product = await createTestProduct();

      const response = await request(app.getHttpServer())
        .delete('/api/v1/products/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ids: [product.id, '550e8400-e29b-41d4-a716-446655440000'],
        })
        .expect(200);

      expect(response.body.success_count).toBe(1);
      expect(response.body.failure_count).toBe(1);
    });
  });

  describe('PATCH /api/v1/products/:id/restore', () => {
    it('should restore soft-deleted product', async () => {
      const product = await createTestProduct({
        deleted_at: new Date(),
        deleted_by: 'user',
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/products/${product.id}/restore`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.deleted_at).toBeNull();
    });

    it('should return 400 when product is not deleted', async () => {
      const product = await createTestProduct();

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/products/${product.id}/restore`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toBe('Product is not deleted');
    });

    it('should return 404 when product does not exist', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/products/550e8400-e29b-41d4-a716-446655440000/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/products/bulk/restore', () => {
    it('should restore multiple soft-deleted products', async () => {
      const product1 = await createTestProduct({
        sku: 'P1',
        deleted_at: new Date(),
        deleted_by: 'user',
      });
      const product2 = await createTestProduct({
        sku: 'P2',
        deleted_at: new Date(),
        deleted_by: 'user',
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/products/bulk/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ids: [product1.id, product2.id] })
        .expect(200);

      expect(response.body.success_count).toBe(2);
    });

    it('should handle products that are not deleted', async () => {
      const activeProduct = await createTestProduct({ sku: 'ACTIVE' });
      const deletedProduct = await createTestProduct({
        sku: 'DELETED',
        deleted_at: new Date(),
        deleted_by: 'user',
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/products/bulk/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ids: [activeProduct.id, deletedProduct.id] })
        .expect(200);

      expect(response.body.success_count).toBe(1);
      expect(response.body.failure_count).toBe(1);
    });
  });
});
