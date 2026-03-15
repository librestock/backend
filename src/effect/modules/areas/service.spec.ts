import { Effect, Layer } from 'effect';
import { makeAreasService } from './service';
import { AreasRepository } from './repository';
import { LocationsService } from '../locations/service';

const makeAreaEntity = (overrides: Record<string, any> = {}) => ({
  id: 'area-1',
  location_id: 'loc-1',
  parent_id: null,
  name: 'Zone A',
  code: 'ZA',
  description: 'Main zone',
  is_active: true,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  children: undefined,
  location: { id: 'loc-1', name: 'Warehouse' },
  ...overrides,
});

const makeMockAreasRepository = (
  overrides: Partial<Record<keyof import('./repository').AreasRepository, jest.Mock>> = {},
) => ({
  create: jest.fn().mockResolvedValue(makeAreaEntity()),
  findAll: jest.fn().mockResolvedValue([makeAreaEntity()]),
  findById: jest.fn().mockResolvedValue(makeAreaEntity()),
  findByIdWithChildren: jest.fn().mockResolvedValue(
    makeAreaEntity({ children: [] }),
  ),
  findHierarchyByLocationId: jest.fn().mockResolvedValue([makeAreaEntity()]),
  update: jest.fn().mockResolvedValue(makeAreaEntity()),
  delete: jest.fn().mockResolvedValue(true),
  existsById: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const makeMockLocationsService = () => ({
  existsById: jest.fn().mockResolvedValue(true),
} as any);

const buildService = (
  areasRepo = makeMockAreasRepository(),
  locationsService = makeMockLocationsService(),
) =>
  Effect.runPromise(
    makeAreasService.pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.succeed(AreasRepository, areasRepo as any),
          Layer.succeed(LocationsService, locationsService),
        ),
      ),
    ),
  );

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const fail = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.flip(effect));

describe('Effect AreasService', () => {
  describe('create', () => {
    it('creates an area', async () => {
      const service = await buildService();
      const result = await run(
        service.create({
          location_id: 'loc-1',
          name: 'Zone A',
        } as any),
      );

      expect(result).toMatchObject({ id: 'area-1', name: 'Zone A' });
    });

    it('fails when location does not exist', async () => {
      const locationsService = { existsById: jest.fn().mockResolvedValue(false) } as any;
      const service = await buildService(undefined, locationsService);

      const error = await fail(
        service.create({ location_id: 'missing', name: 'X' } as any),
      );

      expect(error).toMatchObject({ _tag: 'AreaLocationNotFound' });
    });

    it('fails when parent area does not exist', async () => {
      const repo = makeMockAreasRepository({
        findById: jest.fn().mockResolvedValue(null),
      });
      const service = await buildService(repo);

      const error = await fail(
        service.create({
          location_id: 'loc-1',
          parent_id: 'missing',
          name: 'X',
        } as any),
      );

      expect(error).toMatchObject({ _tag: 'ParentAreaNotFound' });
    });

    it('fails when parent is in a different location', async () => {
      const repo = makeMockAreasRepository({
        findById: jest.fn().mockResolvedValue(
          makeAreaEntity({ location_id: 'loc-other' }),
        ),
      });
      const service = await buildService(repo);

      const error = await fail(
        service.create({
          location_id: 'loc-1',
          parent_id: 'area-1',
          name: 'X',
        } as any),
      );

      expect(error).toMatchObject({ _tag: 'AreaParentLocationMismatch' });
    });
  });

  describe('findAll', () => {
    it('returns flat list by default', async () => {
      const service = await buildService();
      const result = await run(service.findAll({}));

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'area-1' });
    });

    it('returns hierarchy when include_children and location_id', async () => {
      const repo = makeMockAreasRepository();
      const service = await buildService(repo);

      await run(
        service.findAll({
          include_children: true,
          location_id: 'loc-1',
        }),
      );

      expect(repo.findHierarchyByLocationId).toHaveBeenCalledWith('loc-1');
    });
  });

  describe('findById', () => {
    it('returns an area', async () => {
      const service = await buildService();
      const result = await run(service.findById('area-1'));

      expect(result).toMatchObject({ id: 'area-1' });
    });

    it('fails with AreaNotFound', async () => {
      const repo = makeMockAreasRepository({
        findById: jest.fn().mockResolvedValue(null),
      });
      const service = await buildService(repo);

      const error = await fail(service.findById('missing'));
      expect(error).toMatchObject({ _tag: 'AreaNotFound' });
    });
  });

  describe('update', () => {
    it('updates an area', async () => {
      const service = await buildService();
      const result = await run(
        service.update('area-1', { name: 'Updated' } as any),
      );

      expect(result).toMatchObject({ id: 'area-1' });
    });

    it('rejects self-parent', async () => {
      const service = await buildService();

      const error = await fail(
        service.update('area-1', { parent_id: 'area-1' } as any),
      );

      expect(error).toMatchObject({ _tag: 'AreaSelfParent' });
    });

    it('rejects parent-location mismatch', async () => {
      const repo = makeMockAreasRepository({
        findById: jest
          .fn()
          .mockResolvedValueOnce(makeAreaEntity({ location_id: 'loc-1' }))
          .mockResolvedValueOnce(makeAreaEntity({ id: 'area-2', location_id: 'loc-other' })),
      });
      const service = await buildService(repo);

      const error = await fail(
        service.update('area-1', { parent_id: 'area-2' } as any),
      );

      expect(error).toMatchObject({ _tag: 'AreaParentLocationMismatch' });
    });

    it('detects circular references', async () => {
      // area-1, trying to set parent to area-2, but area-2's parent is area-1
      const repo = makeMockAreasRepository({
        findById: jest
          .fn()
          .mockResolvedValueOnce(makeAreaEntity({ id: 'area-1', location_id: 'loc-1' }))
          .mockResolvedValueOnce(makeAreaEntity({ id: 'area-2', location_id: 'loc-1' }))
          // wouldCreateCircularReference walks: area-2's parent chain
          .mockResolvedValueOnce(makeAreaEntity({ id: 'area-2', parent_id: 'area-1', location_id: 'loc-1' }))
          .mockResolvedValueOnce(makeAreaEntity({ id: 'area-1', parent_id: null, location_id: 'loc-1' })),
      });
      const service = await buildService(repo);

      const error = await fail(
        service.update('area-1', { parent_id: 'area-2' } as any),
      );

      expect(error).toMatchObject({ _tag: 'AreaCircularReference' });
    });
  });

  describe('delete', () => {
    it('deletes an area', async () => {
      const repo = makeMockAreasRepository();
      const service = await buildService(repo);

      await run(service.delete('area-1'));

      expect(repo.delete).toHaveBeenCalledWith('area-1');
    });

    it('fails with AreaNotFound when area does not exist', async () => {
      const repo = makeMockAreasRepository({
        existsById: jest.fn().mockResolvedValue(false),
      });
      const service = await buildService(repo);

      const error = await fail(service.delete('missing'));
      expect(error).toMatchObject({ _tag: 'AreaNotFound' });
    });
  });
});
