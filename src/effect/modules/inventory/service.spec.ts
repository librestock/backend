import { Effect, Layer } from 'effect';
import { ProductsService } from '../products/service';
import { LocationsService } from '../locations/service';
import { AreasService } from '../areas/service';
import { AreaNotFound } from '../areas/areas.errors';
import { InventoryRepository } from './repository';
import { InventoryService } from './service';

const makeInventoryEntity = (overrides: Record<string, any> = {}) => ({
  id: 'inventory-1',
  product_id: 'product-1',
  product: {
    id: 'product-1',
    sku: 'SKU-1',
    name: 'Orange Juice',
    unit: 'bottle',
    reorder_point: 10,
  },
  location_id: 'location-1',
  location: {
    id: 'location-1',
    name: 'Warehouse A',
    type: 'WAREHOUSE',
  },
  area_id: null,
  area: null,
  quantity: 25,
  batchNumber: 'BATCH-1',
  expiry_date: new Date('2026-05-01T00:00:00.000Z'),
  cost_per_unit: 9.5,
  received_date: new Date('2026-01-10T00:00:00.000Z'),
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-02T00:00:00.000Z'),
  ...overrides,
});

const makeAreaDto = (overrides: Record<string, any> = {}) => ({
  id: 'area-1',
  location_id: 'location-1',
  parent_id: null,
  name: 'Cold Storage',
  code: 'COLD',
  description: '',
  is_active: true,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const makeMockRepository = (
  overrides: Partial<Record<keyof import('./repository').InventoryRepository, jest.Mock>> = {},
) => ({
  findAllPaginated: jest.fn().mockReturnValue(
    Effect.succeed({
      data: [makeInventoryEntity()],
      total: 1,
      page: 1,
      limit: 20,
      total_pages: 1,
    }),
  ),
  findAll: jest.fn().mockReturnValue(Effect.succeed([makeInventoryEntity()])),
  findById: jest.fn().mockReturnValue(Effect.succeed(makeInventoryEntity())),
  findByProductId: jest.fn().mockReturnValue(Effect.succeed([makeInventoryEntity()])),
  findByLocationId: jest.fn().mockReturnValue(Effect.succeed([makeInventoryEntity()])),
  findByProductAndLocation: jest.fn().mockReturnValue(Effect.succeed(null)),
  create: jest.fn().mockReturnValue(Effect.succeed(makeInventoryEntity({ id: 'inventory-created' }))),
  update: jest.fn().mockReturnValue(Effect.succeed(1)),
  adjustQuantity: jest.fn().mockReturnValue(Effect.succeed(1)),
  delete: jest.fn().mockReturnValue(Effect.succeed(undefined)),
  ...overrides,
});

const makeMockProductsService = (
  overrides: Partial<Record<keyof import('../products/service').ProductsService, jest.Mock>> = {},
) => ({
  existsById: jest.fn().mockReturnValue(Effect.succeed(true)),
  ...overrides,
} as any);

const makeMockLocationsService = (
  overrides: Partial<Record<keyof import('../locations/service').LocationsService, jest.Mock>> = {},
) => ({
  existsById: jest.fn().mockReturnValue(Effect.succeed(true)),
  ...overrides,
} as any);

const makeMockAreasService = (
  overrides: Partial<Record<keyof import('../areas/service').AreasService, jest.Mock>> = {},
) => ({
  findById: jest.fn().mockReturnValue(Effect.succeed(makeAreaDto())),
  ...overrides,
} as any);

const buildService = (
  repository = makeMockRepository(),
  productsService = makeMockProductsService(),
  locationsService = makeMockLocationsService(),
  areasService = makeMockAreasService(),
) =>
  Effect.runPromise(
    InventoryService.pipe(
      Effect.provide(
        InventoryService.DefaultWithoutDependencies.pipe(
          Layer.provide(
            Layer.mergeAll(
              Layer.succeed(InventoryRepository, repository as any),
              Layer.succeed(ProductsService, productsService),
              Layer.succeed(LocationsService, locationsService),
              Layer.succeed(AreasService, areasService),
            ),
          ),
        ),
      ),
    ),
  );

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const fail = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.flip(effect));

describe('Effect InventoryService', () => {
  describe('findAllPaginated', () => {
    it('returns paginated inventory items', async () => {
      const service = await buildService();
      const result = await run(
        service.findAllPaginated({ page: 1, limit: 20 } as any),
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ page: 1, total: 1 });
    });
  });

  describe('findAll', () => {
    it('returns all inventory items', async () => {
      const service = await buildService();
      const result = await run(service.findAll());

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'inventory-1' });
    });
  });

  describe('findOne', () => {
    it('returns an inventory item', async () => {
      const service = await buildService();
      const result = await run(service.findOne('inventory-1'));

      expect(result).toMatchObject({ id: 'inventory-1' });
    });

    it('fails with InventoryNotFound', async () => {
      const repository = makeMockRepository({
        findById: jest.fn().mockReturnValue(Effect.succeed(null)),
      });
      const service = await buildService(repository);

      const error = await fail(service.findOne('missing'));
      expect(error).toMatchObject({ _tag: 'InventoryNotFound' });
    });
  });

  describe('findByProduct', () => {
    it('returns inventory for a product', async () => {
      const repository = makeMockRepository();
      const service = await buildService(repository);

      const result = await run(service.findByProduct('product-1'));

      expect(result).toHaveLength(1);
      expect(repository.findByProductId).toHaveBeenCalledWith('product-1');
    });

    it('fails when product does not exist', async () => {
      const productsService = makeMockProductsService({
        existsById: jest.fn().mockReturnValue(Effect.succeed(false)),
      });
      const service = await buildService(undefined, productsService);

      const error = await fail(service.findByProduct('missing'));
      expect(error).toMatchObject({ _tag: 'InventoryProductNotFound' });
    });
  });

  describe('findByLocation', () => {
    it('returns inventory for a location', async () => {
      const repository = makeMockRepository();
      const service = await buildService(repository);

      const result = await run(service.findByLocation('location-1'));

      expect(result).toHaveLength(1);
      expect(repository.findByLocationId).toHaveBeenCalledWith('location-1');
    });

    it('fails when location does not exist', async () => {
      const locationsService = makeMockLocationsService({
        existsById: jest.fn().mockReturnValue(Effect.succeed(false)),
      });
      const service = await buildService(undefined, undefined, locationsService);

      const error = await fail(service.findByLocation('missing'));
      expect(error).toMatchObject({ _tag: 'InventoryLocationNotFound' });
    });
  });

  describe('create', () => {
    const createDto = {
      product_id: 'product-1',
      location_id: 'location-1',
      area_id: 'area-1',
      quantity: 10,
      batchNumber: 'BATCH-NEW',
      expiry_date: new Date('2026-06-01T00:00:00.000Z'),
      cost_per_unit: 7.5,
      received_date: new Date('2026-01-15T00:00:00.000Z'),
    } as any;

    it('creates inventory after validating related entities', async () => {
      const repository = makeMockRepository({
        findById: jest
          .fn()
          .mockReturnValueOnce(
            Effect.succeed(
              makeInventoryEntity({ id: 'inventory-created', area_id: 'area-1', area: makeAreaDto() }),
            ),
          ),
      });
      const service = await buildService(repository);

      const result = await run(service.create(createDto));

      expect(repository.findByProductAndLocation).toHaveBeenCalledWith(
        'product-1',
        'location-1',
        'area-1',
      );
      expect(repository.create).toHaveBeenCalledWith({
        product_id: 'product-1',
        location_id: 'location-1',
        area_id: 'area-1',
        quantity: 10,
        batch_number: 'BATCH-NEW',
        expiry_date: createDto.expiry_date,
        cost_per_unit: 7.5,
        received_date: createDto.received_date,
      });
      expect(result).toMatchObject({ id: 'inventory-created' });
    });

    it('fails when product does not exist', async () => {
      const productsService = makeMockProductsService({
        existsById: jest.fn().mockReturnValue(Effect.succeed(false)),
      });
      const service = await buildService(undefined, productsService);

      const error = await fail(service.create(createDto));
      expect(error).toMatchObject({ _tag: 'InvalidInventoryProduct' });
    });

    it('fails when location does not exist', async () => {
      const locationsService = makeMockLocationsService({
        existsById: jest.fn().mockReturnValue(Effect.succeed(false)),
      });
      const service = await buildService(undefined, undefined, locationsService);

      const error = await fail(service.create(createDto));
      expect(error).toMatchObject({ _tag: 'InvalidInventoryLocation' });
    });

    it('fails when area does not exist', async () => {
      const areasService = makeMockAreasService({
        findById: jest.fn().mockReturnValue(
          Effect.fail(
            new AreaNotFound({
              id: 'area-1',
              messageKey: 'areas.notFound',
            }),
          ),
        ),
      });
      const service = await buildService(undefined, undefined, undefined, areasService);

      const error = await fail(service.create(createDto));
      expect(error).toMatchObject({ _tag: 'InvalidInventoryArea' });
    });

    it('fails when area belongs to another location', async () => {
      const areasService = makeMockAreasService({
        findById: jest.fn().mockReturnValue(
          Effect.succeed(makeAreaDto({ location_id: 'location-2' })),
        ),
      });
      const service = await buildService(undefined, undefined, undefined, areasService);

      const error = await fail(service.create(createDto));
      expect(error).toMatchObject({ _tag: 'InventoryAreaLocationMismatch' });
    });

    it('fails when matching inventory already exists', async () => {
      const repository = makeMockRepository({
        findByProductAndLocation: jest.fn().mockReturnValue(Effect.succeed(makeInventoryEntity())),
      });
      const service = await buildService(repository);

      const error = await fail(service.create(createDto));
      expect(error).toMatchObject({ _tag: 'InventoryAlreadyExists' });
    });
  });

  describe('update', () => {
    it('returns the current item when the update is empty', async () => {
      const repository = makeMockRepository();
      const service = await buildService(repository);

      const result = await run(service.update('inventory-1', {} as any));

      expect(result).toMatchObject({ id: 'inventory-1' });
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('updates location and area after revalidating uniqueness', async () => {
      const repository = makeMockRepository({
        findById: jest
          .fn()
          .mockReturnValueOnce(Effect.succeed(makeInventoryEntity()))
          .mockReturnValueOnce(
            Effect.succeed(
              makeInventoryEntity({
                location_id: 'location-2',
                location: { id: 'location-2', name: 'Warehouse B', type: 'WAREHOUSE' },
                area_id: 'area-2',
                area: makeAreaDto({ id: 'area-2', location_id: 'location-2' }),
              }),
            ),
          ),
      });
      const locationsService = makeMockLocationsService({
        existsById: jest.fn().mockReturnValue(Effect.succeed(true)),
      });
      const areasService = makeMockAreasService({
        findById: jest.fn().mockReturnValue(
          Effect.succeed(makeAreaDto({ id: 'area-2', location_id: 'location-2' })),
        ),
      });
      const service = await buildService(
        repository,
        undefined,
        locationsService,
        areasService,
      );

      const result = await run(
        service.update('inventory-1', {
          location_id: 'location-2',
          area_id: 'area-2',
        } as any),
      );

      expect(repository.findByProductAndLocation).toHaveBeenCalledWith(
        'product-1',
        'location-2',
        'area-2',
      );
      expect(repository.update).toHaveBeenCalledWith('inventory-1', {
        location_id: 'location-2',
        area_id: 'area-2',
      });
      expect(result).toMatchObject({ location_id: 'location-2', area_id: 'area-2' });
    });

    it('fails when the updated combination already exists', async () => {
      const repository = makeMockRepository({
        findByProductAndLocation: jest.fn().mockReturnValue(
          Effect.succeed(makeInventoryEntity({ id: 'inventory-2' })),
        ),
      });
      const locationsService = makeMockLocationsService({
        existsById: jest.fn().mockReturnValue(Effect.succeed(true)),
      });
      const service = await buildService(repository, undefined, locationsService);

      const error = await fail(
        service.update('inventory-1', { location_id: 'location-2' } as any),
      );
      expect(error).toMatchObject({ _tag: 'InventoryAlreadyExists' });
    });
  });

  describe('adjustQuantity', () => {
    it('adjusts quantity and reloads the item', async () => {
      const repository = makeMockRepository({
        findById: jest
          .fn()
          .mockReturnValueOnce(Effect.succeed(makeInventoryEntity({ quantity: 10 })))
          .mockReturnValueOnce(Effect.succeed(makeInventoryEntity({ quantity: 7 }))),
      });
      const service = await buildService(repository);

      const result = await run(
        service.adjustQuantity('inventory-1', { adjustment: -3 } as any),
      );

      expect(repository.adjustQuantity).toHaveBeenCalledWith('inventory-1', -3);
      expect(result).toMatchObject({ quantity: 7 });
    });

    it('fails when the adjustment would go negative', async () => {
      const repository = makeMockRepository({
        adjustQuantity: jest.fn().mockReturnValue(Effect.succeed(0)),
      });
      const service = await buildService(repository);

      const error = await fail(
        service.adjustQuantity('inventory-1', { adjustment: -100 } as any),
      );
      expect(error).toMatchObject({ _tag: 'InventoryQuantityAdjustmentFailed' });
    });
  });

  describe('delete', () => {
    it('deletes an inventory item', async () => {
      const repository = makeMockRepository();
      const service = await buildService(repository);

      await run(service.delete('inventory-1'));

      expect(repository.delete).toHaveBeenCalledWith('inventory-1');
    });

    it('fails with InventoryNotFound when deleting nonexistent inventory', async () => {
      const repository = makeMockRepository({
        findById: jest.fn().mockReturnValue(Effect.succeed(null)),
      });
      const service = await buildService(repository);

      const error = await fail(service.delete('missing'));
      expect(error).toMatchObject({ _tag: 'InventoryNotFound' });
    });
  });
});
