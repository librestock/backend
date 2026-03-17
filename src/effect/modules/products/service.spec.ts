import { Effect, Layer } from 'effect';
import { CategoriesService } from '../categories/service';
import { ProductsService } from './service';
import { ProductsRepository } from './repository';

const makeProductEntity = (overrides: Record<string, any> = {}) => ({
  id: 'prod-1',
  sku: 'SKU-001',
  name: 'Widget',
  description: null,
  category_id: 'cat-1',
  volume_ml: null,
  weight_kg: null,
  dimensions_cm: null,
  standard_cost: 10,
  standard_price: 20,
  markup_percentage: null,
  reorder_point: 5,
  primary_supplier_id: null,
  supplier_sku: null,
  barcode: null,
  unit: null,
  is_active: true,
  is_perishable: false,
  notes: null,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  deleted_at: null,
  created_by: null,
  updated_by: null,
  deleted_by: null,
  category: { id: 'cat-1', name: 'Electronics', parent_id: null },
  primary_supplier: null,
  ...overrides,
});

const makeMockRepository = (
  overrides: Partial<
    Record<keyof import('./repository').ProductsRepository, jest.Mock>
  > = {},
) => ({
  findAllPaginated: jest.fn().mockReturnValue(
    Effect.succeed({
      data: [makeProductEntity()],
      total: 1,
      page: 1,
      limit: 20,
      total_pages: 1,
    }),
  ),
  findAll: jest.fn().mockReturnValue(Effect.succeed([makeProductEntity()])),
  findById: jest.fn().mockReturnValue(Effect.succeed(makeProductEntity())),
  findBySku: jest.fn().mockReturnValue(Effect.succeed(null)),
  findByCategoryId: jest.fn().mockReturnValue(Effect.succeed([makeProductEntity()])),
  findByCategoryIds: jest.fn().mockReturnValue(Effect.succeed([makeProductEntity()])),
  findByIds: jest.fn().mockReturnValue(Effect.succeed([makeProductEntity()])),
  findDeletedByIds: jest
    .fn()
    .mockReturnValue(Effect.succeed([makeProductEntity({ deleted_at: new Date() })])),
  existsById: jest.fn().mockReturnValue(Effect.succeed(true)),
  create: jest.fn().mockReturnValue(Effect.succeed(makeProductEntity())),
  update: jest.fn().mockReturnValue(Effect.succeed(1)),
  updateMany: jest.fn().mockReturnValue(Effect.succeed(1)),
  softDelete: jest.fn().mockReturnValue(Effect.succeed(undefined)),
  softDeleteMany: jest.fn().mockReturnValue(Effect.succeed(1)),
  restore: jest.fn().mockReturnValue(Effect.succeed(undefined)),
  restoreMany: jest.fn().mockReturnValue(Effect.succeed(1)),
  hardDelete: jest.fn().mockReturnValue(Effect.succeed(undefined)),
  hardDeleteMany: jest.fn().mockReturnValue(Effect.succeed(1)),
  ...overrides,
});

const makeMockCategoriesService = () =>
  ({
    existsById: jest.fn().mockReturnValue(Effect.succeed(true)),
    findAllDescendantIds: jest.fn().mockReturnValue(Effect.succeed(['child-1'])),
  }) as any;

const buildService = (
  repo = makeMockRepository(),
  categoriesService = makeMockCategoriesService(),
) =>
  Effect.runPromise(
    ProductsService.pipe(
      Effect.provide(
        ProductsService.DefaultWithoutDependencies.pipe(
          Layer.provide(
            Layer.mergeAll(
              Layer.succeed(ProductsRepository, repo as any),
              Layer.succeed(CategoriesService, categoriesService),
            ),
          ),
        ),
      ),
    ),
  );

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const fail = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.flip(effect));

describe('Effect ProductsService', () => {
  describe('findAllPaginated', () => {
    it('returns paginated products', async () => {
      const service = await buildService();
      const result = await run(
        service.findAllPaginated({ page: 1, limit: 20 } as any),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ page: 1, total: 1 });
    });
  });

  describe('findAll', () => {
    it('returns all products', async () => {
      const service = await buildService();
      const result = await run(service.findAll());
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns a product', async () => {
      const service = await buildService();
      const result = await run(service.findOne('prod-1', false));
      expect(result).toMatchObject({ id: 'prod-1', sku: 'SKU-001' });
    });

    it('fails with ProductNotFound', async () => {
      const repo = makeMockRepository({
        findById: jest.fn().mockReturnValue(Effect.succeed(null)),
      });
      const service = await buildService(repo);
      const error = await fail(service.findOne('missing', false));
      expect(error).toMatchObject({ _tag: 'ProductNotFound' });
    });
  });

  describe('findByCategory', () => {
    it('returns products by category', async () => {
      const service = await buildService();
      const result = await run(service.findByCategory('cat-1'));
      expect(result).toHaveLength(1);
    });

    it('fails when category not found', async () => {
      const catService = {
        existsById: jest.fn().mockReturnValue(Effect.succeed(false)),
        findAllDescendantIds: jest.fn(),
      } as any;
      const service = await buildService(undefined, catService);
      const error = await fail(service.findByCategory('missing'));
      expect(error).toMatchObject({ _tag: 'CategoryNotFound' });
    });
  });

  describe('findByCategoryTree', () => {
    it('returns products from category tree', async () => {
      const service = await buildService();
      const result = await run(service.findByCategoryTree('cat-1'));
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('creates a product', async () => {
      const service = await buildService();
      const result = await run(
        service.create(
          {
            sku: 'SKU-001',
            name: 'Widget',
            category_id: 'cat-1',
            reorder_point: 5,
            is_active: true,
            is_perishable: false,
          } as any,
          undefined,
        ),
      );
      expect(result).toMatchObject({ id: 'prod-1' });
    });

    it('fails when category does not exist', async () => {
      const catService = {
        existsById: jest.fn().mockReturnValue(Effect.succeed(false)),
        findAllDescendantIds: jest.fn(),
      } as any;
      const service = await buildService(undefined, catService);
      const error = await fail(
        service.create(
          {
            sku: 'X',
            name: 'X',
            category_id: 'missing',
            reorder_point: 1,
            is_active: true,
            is_perishable: false,
          } as any,
          undefined,
        ),
      );
      expect(error).toMatchObject({ _tag: 'CategoryNotFound' });
    });

    it('fails when SKU already exists', async () => {
      const repo = makeMockRepository({
        findBySku: jest.fn().mockReturnValue(Effect.succeed(makeProductEntity())),
      });
      const service = await buildService(repo);
      const error = await fail(
        service.create(
          {
            sku: 'SKU-001',
            name: 'X',
            category_id: 'cat-1',
            reorder_point: 1,
            is_active: true,
            is_perishable: false,
          } as any,
          undefined,
        ),
      );
      expect(error).toMatchObject({ _tag: 'SkuAlreadyExists' });
    });

    it('fails when price below cost', async () => {
      const service = await buildService();
      const error = await fail(
        service.create(
          {
            sku: 'SKU-002',
            name: 'Cheap',
            category_id: 'cat-1',
            reorder_point: 1,
            is_active: true,
            is_perishable: false,
            standard_cost: 100,
            standard_price: 50,
          } as any,
          undefined,
        ),
      );
      expect(error).toMatchObject({ _tag: 'PriceBelowCost' });
    });
  });

  describe('update', () => {
    it('updates a product', async () => {
      const service = await buildService();
      const result = await run(
        service.update('prod-1', { name: 'Updated' } as any, undefined),
      );
      expect(result).toMatchObject({ id: 'prod-1' });
    });

    it('returns current entity on empty update', async () => {
      const repo = makeMockRepository();
      const service = await buildService(repo);
      await run(service.update('prod-1', {} as any, undefined));
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('soft deletes by default', async () => {
      const repo = makeMockRepository();
      const service = await buildService(repo);
      await run(service.delete('prod-1', undefined, false));
      expect(repo.softDelete).toHaveBeenCalledWith('prod-1', undefined);
    });

    it('hard deletes when permanent', async () => {
      const repo = makeMockRepository();
      const service = await buildService(repo);
      await run(service.delete('prod-1', 'user-1', true));
      expect(repo.hardDelete).toHaveBeenCalledWith('prod-1');
    });
  });

  describe('restore', () => {
    it('restores a deleted product', async () => {
      const repo = makeMockRepository({
        findById: jest
          .fn()
          .mockReturnValue(Effect.succeed(makeProductEntity({ deleted_at: new Date() }))),
      });
      const service = await buildService(repo);
      const result = await run(service.restore('prod-1'));
      expect(result).toMatchObject({ id: 'prod-1' });
    });

    it('fails when product is not deleted', async () => {
      const service = await buildService();
      const error = await fail(service.restore('prod-1'));
      expect(error).toMatchObject({ _tag: 'ProductNotDeleted' });
    });
  });

  describe('bulkCreate', () => {
    it('creates products in bulk', async () => {
      const service = await buildService();
      const result = await run(service.bulkCreate(
        {
          products: [
            {
              sku: 'SKU-A',
              name: 'A',
              category_id: 'cat-1',
              reorder_point: 1,
              is_active: true,
              is_perishable: false,
            } as any,
          ],
        },
        undefined,
      ));
      expect(result.success_count).toBe(1);
    });

    it('fails all when category missing', async () => {
      const catService = {
        existsById: jest.fn().mockReturnValue(Effect.succeed(false)),
        findAllDescendantIds: jest.fn(),
      } as any;
      const service = await buildService(undefined, catService);
      const result = await run(service.bulkCreate(
        {
          products: [
            {
              sku: 'SKU-A',
              name: 'A',
              category_id: 'missing',
              reorder_point: 1,
              is_active: true,
              is_perishable: false,
            } as any,
          ],
        },
        undefined,
      ));
      expect(result.failure_count).toBe(1);
    });

    it('rejects duplicate SKUs in request', async () => {
      const service = await buildService();
      const result = await run(service.bulkCreate(
        {
          products: [
            {
              sku: 'DUP',
              name: 'A',
              category_id: 'cat-1',
              reorder_point: 1,
              is_active: true,
              is_perishable: false,
            } as any,
            {
              sku: 'DUP',
              name: 'B',
              category_id: 'cat-1',
              reorder_point: 1,
              is_active: true,
              is_perishable: false,
            } as any,
          ],
        },
        undefined,
      ));
      expect(result.failure_count).toBe(2);
    });
  });

  describe('bulkUpdateStatus', () => {
    it('updates status in bulk', async () => {
      const service = await buildService();
      const result = await run(service.bulkUpdateStatus(
        { ids: ['prod-1'], is_active: false },
        undefined,
      ));
      expect(result.success_count).toBe(1);
    });

    it('reports not found products', async () => {
      const repo = makeMockRepository({
        findByIds: jest.fn().mockReturnValue(Effect.succeed([])),
      });
      const service = await buildService(repo);
      const result = await run(service.bulkUpdateStatus(
        { ids: ['missing'], is_active: false },
        undefined,
      ));
      expect(result.failure_count).toBe(1);
    });
  });

  describe('bulkDelete', () => {
    it('soft deletes in bulk', async () => {
      const repo = makeMockRepository();
      const service = await buildService(repo);
      const result = await run(service.bulkDelete(
        { ids: ['prod-1'], permanent: false },
        undefined,
      ));
      expect(result.success_count).toBe(1);
      expect(repo.softDeleteMany).toHaveBeenCalled();
    });

    it('hard deletes in bulk when permanent', async () => {
      const repo = makeMockRepository();
      const service = await buildService(repo);
      const result = await run(service.bulkDelete(
        { ids: ['prod-1'], permanent: true },
        undefined,
      ));
      expect(result.success_count).toBe(1);
      expect(repo.hardDeleteMany).toHaveBeenCalled();
    });
  });

  describe('bulkRestore', () => {
    it('restores deleted products', async () => {
      const service = await buildService();
      const result = await run(service.bulkRestore({ ids: ['prod-1'] }));
      expect(result.success_count).toBe(1);
    });

    it('reports not deleted products', async () => {
      const repo = makeMockRepository({
        findDeletedByIds: jest.fn().mockReturnValue(Effect.succeed([])),
      });
      const service = await buildService(repo);
      const result = await run(service.bulkRestore({ ids: ['prod-1'] }));
      expect(result.failure_count).toBe(1);
    });
  });
});
