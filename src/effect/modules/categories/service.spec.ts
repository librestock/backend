import { Effect, Layer } from 'effect';
import { makeCategoriesService } from './service';
import { CategoriesRepository } from './repository';

const makeCategoryEntity = (overrides: Record<string, any> = {}) => ({
  id: 'cat-1',
  name: 'Electronics',
  parent_id: null,
  description: 'Electronic goods',
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  ...overrides,
});

const makeMockRepository = (
  overrides: Partial<Record<keyof import('./repository').CategoriesRepository, jest.Mock>> = {},
) => ({
  findAll: jest.fn().mockResolvedValue([makeCategoryEntity()]),
  findById: jest.fn().mockResolvedValue(makeCategoryEntity()),
  existsById: jest.fn().mockResolvedValue(true),
  existsByName: jest.fn().mockResolvedValue(false),
  create: jest.fn().mockResolvedValue(makeCategoryEntity()),
  update: jest.fn().mockResolvedValue(1),
  delete: jest.fn().mockResolvedValue(undefined),
  findOne: jest.fn().mockResolvedValue(null),
  findAllDescendantIds: jest.fn().mockResolvedValue([]),
  ...overrides,
});

const buildService = (repo = makeMockRepository()) =>
  Effect.runPromise(
    makeCategoriesService.pipe(
      Effect.provide(Layer.succeed(CategoriesRepository, repo as any)),
    ),
  );

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const fail = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.flip(effect));

describe('Effect CategoriesService', () => {
  describe('findAll (tree)', () => {
    it('builds a tree from flat categories', async () => {
      const repo = makeMockRepository({
        findAll: jest.fn().mockResolvedValue([
          makeCategoryEntity({ id: 'cat-1', name: 'Root', parent_id: null }),
          makeCategoryEntity({
            id: 'cat-2',
            name: 'Child',
            parent_id: 'cat-1',
          }),
        ]),
      });
      const service = await buildService(repo);
      const result = await run(service.findAll());

      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('Root');
      expect(result[0]!.children).toHaveLength(1);
      expect(result[0]!.children![0]!.name).toBe('Child');
    });

    it('returns empty array for no categories', async () => {
      const repo = makeMockRepository({
        findAll: jest.fn().mockResolvedValue([]),
      });
      const service = await buildService(repo);
      const result = await run(service.findAll());

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates a category', async () => {
      const service = await buildService();
      const result = await run(
        service.create({ name: 'New', permissions: [] } as any),
      );

      expect(result).toMatchObject({ id: 'cat-1' });
    });

    it('validates parent existence', async () => {
      const repo = makeMockRepository({
        existsById: jest.fn().mockResolvedValue(false),
      });
      const service = await buildService(repo);

      const error = await fail(
        service.create({
          name: 'Child',
          parent_id: 'missing-parent',
        } as any),
      );

      expect(error).toMatchObject({ _tag: 'ParentCategoryNotFound' });
    });

    it('rejects duplicate name in same scope', async () => {
      const repo = makeMockRepository({
        existsByName: jest.fn().mockResolvedValue(true),
      });
      const service = await buildService(repo);

      const error = await fail(
        service.create({ name: 'Electronics' } as any),
      );

      expect(error).toMatchObject({ _tag: 'CategoryNameAlreadyExists' });
    });
  });

  describe('update', () => {
    it('updates a category', async () => {
      const repo = makeMockRepository({
        findById: jest
          .fn()
          .mockResolvedValueOnce(makeCategoryEntity())
          .mockResolvedValueOnce(makeCategoryEntity({ name: 'Updated' })),
      });
      const service = await buildService(repo);

      const result = await run(
        service.update('cat-1', { name: 'Updated' }),
      );

      expect(result).toMatchObject({ name: 'Updated' });
    });

    it('rejects self-parent', async () => {
      const service = await buildService();

      const error = await fail(
        service.update('cat-1', { parent_id: 'cat-1' }),
      );

      expect(error).toMatchObject({ _tag: 'CategorySelfParent' });
    });

    it('detects circular references', async () => {
      // cat-1 -> cat-2 -> cat-3, trying to set cat-1.parent = cat-3
      const repo = makeMockRepository({
        findById: jest.fn().mockResolvedValue(makeCategoryEntity()),
        findOne: jest
          .fn()
          .mockResolvedValueOnce({ parent_id: 'cat-1' }) // cat-3's parent is cat-1 (cycle!)
      });
      const service = await buildService(repo);

      const error = await fail(
        service.update('cat-1', { parent_id: 'cat-3' }),
      );

      expect(error).toMatchObject({ _tag: 'CategoryCircularReference' });
    });

    it('returns current category when no fields to update', async () => {
      const repo = makeMockRepository();
      const service = await buildService(repo);

      const result = await run(service.update('cat-1', {}));

      expect(result).toMatchObject({ id: 'cat-1' });
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('fails with CategoryNotFound', async () => {
      const repo = makeMockRepository({
        findById: jest.fn().mockResolvedValue(null),
      });
      const service = await buildService(repo);

      const error = await fail(service.update('missing', { name: 'X' }));
      expect(error).toMatchObject({ _tag: 'CategoryNotFound' });
    });
  });

  describe('delete', () => {
    it('deletes a category', async () => {
      const repo = makeMockRepository();
      const service = await buildService(repo);

      await run(service.delete('cat-1'));

      expect(repo.delete).toHaveBeenCalledWith('cat-1');
    });

    it('fails with CategoryNotFound', async () => {
      const repo = makeMockRepository({
        findById: jest.fn().mockResolvedValue(null),
      });
      const service = await buildService(repo);

      const error = await fail(service.delete('missing'));
      expect(error).toMatchObject({ _tag: 'CategoryNotFound' });
    });
  });
});
