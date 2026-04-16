import { Effect, Layer } from 'effect';
import {
  getTestDb,
  closeTestDb,
  truncateAll,
  makeTestDrizzleLayer,
} from '../../test/integration-layer';
import { seedCategory } from '../../test/seed';
import type { DrizzleDb } from '../../platform/drizzle';
import { CategoriesService } from './service';

let db: DrizzleDb;
let TestLayer: Layer.Layer<CategoriesService>;

beforeAll(() => {
  db = getTestDb();
  const dbLayer = makeTestDrizzleLayer();
  TestLayer = CategoriesService.Default.pipe(Layer.provide(dbLayer));
});

afterAll(() => closeTestDb());
beforeEach(() => truncateAll());

const run = <A, E>(effect: Effect.Effect<A, E, CategoriesService>) =>
  Effect.runPromise(effect.pipe(Effect.provide(TestLayer)));

const fail = <A, E>(effect: Effect.Effect<A, E, CategoriesService>) =>
  Effect.runPromise(Effect.flip(effect.pipe(Effect.provide(TestLayer))));

describe('CategoriesService Integration', () => {
  describe('create', () => {
    it('creates a root category', async () => {
      const result = await run(
        Effect.flatMap(CategoriesService, (svc) =>
          svc.create({ name: 'Beverages' } as any),
        ),
      );

      expect(result.name).toBe('Beverages');
      expect(result.parent_id).toBeNull();
    });

    it('creates a child category under a parent', async () => {
      const parent = await seedCategory(db, { name: 'Beverages' });

      const result = await run(
        Effect.flatMap(CategoriesService, (svc) =>
          svc.create({ name: 'Wines', parent_id: parent.id } as any),
        ),
      );

      expect(result.name).toBe('Wines');
      expect(result.parent_id).toBe(parent.id);
    });

    it('rejects duplicate name under the same parent', async () => {
      await run(
        Effect.flatMap(CategoriesService, (svc) =>
          svc.create({ name: 'Spirits' } as any),
        ),
      );

      const error = await fail(
        Effect.flatMap(CategoriesService, (svc) =>
          svc.create({ name: 'Spirits' } as any),
        ),
      );

      expect(error._tag).toBe('CategoryNameAlreadyExists');
    });

    it('allows same name under different parents', async () => {
      const parentA = await seedCategory(db, { name: 'Food' });
      const parentB = await seedCategory(db, { name: 'Drink' });

      const [a, b] = await run(
        Effect.flatMap(CategoriesService, (svc) =>
          Effect.all([
            svc.create({ name: 'Premium', parent_id: parentA.id } as any),
            svc.create({ name: 'Premium', parent_id: parentB.id } as any),
          ], { concurrency: 1 }),
        ),
      );

      expect(a.name).toBe('Premium');
      expect(b.name).toBe('Premium');
      expect(a.id).not.toBe(b.id);
    });

    it('rejects nonexistent parent', async () => {
      const error = await fail(
        Effect.flatMap(CategoriesService, (svc) =>
          svc.create({
            name: 'Orphan',
            parent_id: '00000000-0000-0000-0000-000000000000',
          } as any),
        ),
      );

      expect(error._tag).toBe('ParentCategoryNotFound');
    });
  });

  describe('update', () => {
    it('renames a category', async () => {
      const cat = await seedCategory(db, { name: 'Old Name' });

      const result = await run(
        Effect.flatMap(CategoriesService, (svc) =>
          svc.update(cat.id, { name: 'New Name' } as any),
        ),
      );

      expect(result.name).toBe('New Name');
    });

    it('rejects self-parent', async () => {
      const cat = await seedCategory(db, { name: 'Loop' });

      const error = await fail(
        Effect.flatMap(CategoriesService, (svc) =>
          svc.update(cat.id, { parent_id: cat.id } as any),
        ),
      );

      expect(error._tag).toBe('CategorySelfParent');
    });

    it('detects circular reference', async () => {
      const grandparent = await seedCategory(db, { name: 'GP' });
      const parent = await seedCategory(db, { name: 'P', parent_id: grandparent.id });
      const child = await seedCategory(db, { name: 'C', parent_id: parent.id });

      // Try to make grandparent a child of child → circular
      const error = await fail(
        Effect.flatMap(CategoriesService, (svc) =>
          svc.update(grandparent.id, { parent_id: child.id } as any),
        ),
      );

      expect(error._tag).toBe('CategoryCircularReference');
    });
  });

  describe('findAll (tree)', () => {
    it('returns hierarchical tree structure', async () => {
      const root = await seedCategory(db, { name: 'Root' });
      await seedCategory(db, { name: 'Child A', parent_id: root.id });
      await seedCategory(db, { name: 'Child B', parent_id: root.id });

      const tree = await run(
        Effect.flatMap(CategoriesService, (svc) => svc.findAll()),
      );

      const rootNode = tree.find((c: any) => c.name === 'Root');
      expect(rootNode).toBeTruthy();
      expect(rootNode!.children).toHaveLength(2);
    });
  });

  describe('findAllDescendantIds', () => {
    it('returns all descendant IDs recursively', async () => {
      const root = await seedCategory(db, { name: 'Root' });
      const child = await seedCategory(db, { name: 'Child', parent_id: root.id });
      const grandchild = await seedCategory(db, { name: 'Grandchild', parent_id: child.id });

      const ids = await run(
        Effect.flatMap(CategoriesService, (svc) =>
          svc.findAllDescendantIds(root.id),
        ),
      );

      expect(ids).toContain(child.id);
      expect(ids).toContain(grandchild.id);
      expect(ids).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('deletes a category', async () => {
      const cat = await seedCategory(db, { name: 'Doomed' });

      await run(
        Effect.flatMap(CategoriesService, (svc) => svc.delete(cat.id)),
      );

      const tree = await run(
        Effect.flatMap(CategoriesService, (svc) => svc.findAll()),
      );
      expect(tree.find((c: any) => c.id === cat.id)).toBeUndefined();
    });
  });
});
