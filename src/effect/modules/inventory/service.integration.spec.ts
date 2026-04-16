import { Effect, Layer } from 'effect';
import {
  getTestDb,
  closeTestDb,
  truncateAll,
  makeTestDrizzleLayer,
} from '../../test/integration-layer';
import {
  seedCategory,
  seedProduct,
  seedLocation,
  seedArea,
  seedInventory,
} from '../../test/seed';
import type { DrizzleDb } from '../../platform/drizzle';
import { InventoryService } from './service';

let db: DrizzleDb;
let TestLayer: Layer.Layer<InventoryService>;

beforeAll(() => {
  db = getTestDb();
  const dbLayer = makeTestDrizzleLayer();
  TestLayer = InventoryService.Default.pipe(Layer.provide(dbLayer));
});

afterAll(() => closeTestDb());
beforeEach(() => truncateAll());

const run = <A, E>(effect: Effect.Effect<A, E, InventoryService>) =>
  Effect.runPromise(effect.pipe(Effect.provide(TestLayer)));

const fail = <A, E>(effect: Effect.Effect<A, E, InventoryService>) =>
  Effect.runPromise(Effect.flip(effect.pipe(Effect.provide(TestLayer))));

async function seedInventoryPrereqs() {
  const category = await seedCategory(db);
  const product = await seedProduct(db, { category_id: category.id });
  const location = await seedLocation(db);
  return { category, product, location };
}

describe('InventoryService Integration', () => {
  describe('create', () => {
    it('creates an inventory record with real references', async () => {
      const { product, location } = await seedInventoryPrereqs();

      const result = await run(
        Effect.flatMap(InventoryService, (svc) =>
          svc.create({
            product_id: product.id,
            location_id: location.id,
            quantity: 50,
            batchNumber: 'BATCH-001',
            cost_per_unit: 12.5,
          } as any),
        ),
      );

      expect(result.product_id).toBe(product.id);
      expect(result.location_id).toBe(location.id);
      expect(result.quantity).toBe(50);
    });

    it('creates inventory with an area and validates location match', async () => {
      const { product, location } = await seedInventoryPrereqs();
      const area = await seedArea(db, { location_id: location.id });

      const result = await run(
        Effect.flatMap(InventoryService, (svc) =>
          svc.create({
            product_id: product.id,
            location_id: location.id,
            area_id: area.id,
            quantity: 20,
          } as any),
        ),
      );

      expect(result.area_id).toBe(area.id);
    });

    it('rejects area that belongs to a different location', async () => {
      const { product, location } = await seedInventoryPrereqs();
      const otherLocation = await seedLocation(db);
      const area = await seedArea(db, { location_id: otherLocation.id });

      const error = await fail(
        Effect.flatMap(InventoryService, (svc) =>
          svc.create({
            product_id: product.id,
            location_id: location.id,
            area_id: area.id,
            quantity: 10,
          } as any),
        ),
      );

      expect(error._tag).toBe('InventoryAreaLocationMismatch');
    });

    it('rejects duplicate product+location+area combination', async () => {
      const { product, location } = await seedInventoryPrereqs();

      const error = await fail(
        Effect.flatMap(InventoryService, (svc) =>
          Effect.flatMap(
            svc.create({
              product_id: product.id,
              location_id: location.id,
              quantity: 10,
            } as any),
            () =>
              svc.create({
                product_id: product.id,
                location_id: location.id,
                quantity: 5,
              } as any),
          ),
        ),
      );

      expect(error._tag).toBe('InventoryAlreadyExists');
    });

    it('rejects nonexistent product', async () => {
      const location = await seedLocation(db);

      const error = await fail(
        Effect.flatMap(InventoryService, (svc) =>
          svc.create({
            product_id: '00000000-0000-0000-0000-000000000000',
            location_id: location.id,
            quantity: 10,
          } as any),
        ),
      );

      expect(error._tag).toBe('InvalidInventoryProduct');
    });
  });

  describe('adjustQuantity', () => {
    it('adjusts quantity up and down within bounds', async () => {
      const { product, location } = await seedInventoryPrereqs();
      await seedInventory(db, {
        product_id: product.id,
        location_id: location.id,
        quantity: 50,
      });

      const result = await run(
        Effect.flatMap(InventoryService, (svc) =>
          Effect.gen(function* () {
            const all = yield* svc.findByProduct(product.id);
            const inv = all[0]!;

            const after = yield* svc.adjustQuantity(inv.id, {
              adjustment: -20,
            } as any);
            expect(after.quantity).toBe(30);

            return yield* svc.adjustQuantity(inv.id, {
              adjustment: 10,
            } as any);
          }),
        ),
      );

      expect(result.quantity).toBe(40);
    });

    it('rejects adjustment that would go negative', async () => {
      const { product, location } = await seedInventoryPrereqs();
      await seedInventory(db, {
        product_id: product.id,
        location_id: location.id,
        quantity: 5,
      });

      const error = await fail(
        Effect.flatMap(InventoryService, (svc) =>
          Effect.gen(function* () {
            const all = yield* svc.findByProduct(product.id);
            return yield* svc.adjustQuantity(all[0]!.id, {
              adjustment: -10,
            } as any);
          }),
        ),
      );

      expect(error._tag).toBe('InventoryQuantityAdjustmentFailed');
    });
  });

  describe('findByProduct / findByLocation', () => {
    it('returns inventory records filtered by product', async () => {
      const { product, location } = await seedInventoryPrereqs();
      await seedInventory(db, {
        product_id: product.id,
        location_id: location.id,
        quantity: 30,
      });

      const result = await run(
        Effect.flatMap(InventoryService, (svc) =>
          svc.findByProduct(product.id),
        ),
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.product_id).toBe(product.id);
      expect(result[0]!.product).toMatchObject({ name: product.name });
      expect(result[0]!.location).toMatchObject({ name: location.name });
    });
  });

  describe('delete', () => {
    it('deletes an inventory record', async () => {
      const { product, location } = await seedInventoryPrereqs();
      await seedInventory(db, {
        product_id: product.id,
        location_id: location.id,
      });

      const error = await fail(
        Effect.flatMap(InventoryService, (svc) =>
          Effect.gen(function* () {
            const all = yield* svc.findByProduct(product.id);
            yield* svc.delete(all[0]!.id);
            return yield* svc.findOne(all[0]!.id);
          }),
        ),
      );

      expect(error._tag).toBe('InventoryNotFound');
    });
  });
});
