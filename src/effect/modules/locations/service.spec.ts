import { Effect, Layer } from 'effect';
import { makeLocationsService } from './service';
import { LocationsRepository } from './repository';

const makeLocationEntity = (overrides: Record<string, any> = {}) => ({
  id: 'loc-1',
  name: 'Warehouse A',
  type: 'WAREHOUSE',
  address: '123 Main St',
  contact_person: 'John',
  phone: '555-0100',
  is_active: true,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  ...overrides,
});

const makeMockRepository = (
  overrides: Partial<Record<keyof import('./repository').LocationsRepository, jest.Mock>> = {},
) => ({
  findAllPaginated: jest.fn().mockResolvedValue({
    data: [makeLocationEntity()],
    total: 1,
    page: 1,
    limit: 20,
    total_pages: 1,
  }),
  findAll: jest.fn().mockResolvedValue([makeLocationEntity()]),
  findById: jest.fn().mockResolvedValue(makeLocationEntity()),
  existsById: jest.fn().mockResolvedValue(true),
  create: jest.fn().mockResolvedValue(makeLocationEntity()),
  update: jest.fn().mockResolvedValue(1),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const buildService = (repo = makeMockRepository()) =>
  Effect.runPromise(
    makeLocationsService.pipe(
      Effect.provide(Layer.succeed(LocationsRepository, repo as any)),
    ),
  );

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

describe('Effect LocationsService', () => {
  it('returns paginated locations', async () => {
    const service = await buildService();
    const result = await run(
      service.findAllPaginated({ page: 1, limit: 20 } as any),
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ id: 'loc-1', name: 'Warehouse A' });
    expect(result.meta.total).toBe(1);
  });

  it('returns all locations (unpaginated)', async () => {
    const service = await buildService();
    const result = await run(service.findAll());

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'loc-1' });
  });

  it('returns a single location', async () => {
    const service = await buildService();
    const result = await run(service.findOne('loc-1'));

    expect(result).toMatchObject({ id: 'loc-1', name: 'Warehouse A' });
  });

  it('fails with LocationNotFound when location does not exist', async () => {
    const repo = makeMockRepository({
      findById: jest.fn().mockResolvedValue(null),
    });
    const service = await buildService(repo);

    const error = await Effect.runPromise(
      Effect.flip(service.findOne('missing')),
    );
    expect(error).toMatchObject({ _tag: 'LocationNotFound' });
  });

  it('creates a location with defaults', async () => {
    const repo = makeMockRepository();
    const service = await buildService(repo);

    await run(service.create({ name: 'New', type: 'WAREHOUSE' as any }));

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New',
        type: 'WAREHOUSE',
        address: '',
        contact_person: '',
        phone: '',
        is_active: true,
      }),
    );
  });

  it('returns current entity when update DTO is empty', async () => {
    const repo = makeMockRepository();
    const service = await buildService(repo);

    const result = await run(service.update('loc-1', {} as any));

    expect(result).toMatchObject({ id: 'loc-1' });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('updates and reloads', async () => {
    const repo = makeMockRepository({
      findById: jest
        .fn()
        .mockResolvedValueOnce(makeLocationEntity())
        .mockResolvedValueOnce(
          makeLocationEntity({ name: 'Updated' }),
        ),
    });
    const service = await buildService(repo);

    const result = await run(
      service.update('loc-1', { name: 'Updated' } as any),
    );

    expect(repo.update).toHaveBeenCalledWith('loc-1', { name: 'Updated' });
    expect(result).toMatchObject({ name: 'Updated' });
  });

  it('deletes a location', async () => {
    const repo = makeMockRepository();
    const service = await buildService(repo);

    await run(service.delete('loc-1'));

    expect(repo.delete).toHaveBeenCalledWith('loc-1');
  });

  it('fails with LocationNotFound when deleting nonexistent location', async () => {
    const repo = makeMockRepository({
      findById: jest.fn().mockResolvedValue(null),
    });
    const service = await buildService(repo);

    const error = await Effect.runPromise(
      Effect.flip(service.delete('missing')),
    );
    expect(error).toMatchObject({ _tag: 'LocationNotFound' });
  });
});
