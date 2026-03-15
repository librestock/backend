import { Effect, Layer } from 'effect';
import { BrandingService } from './service';
import { TypeOrmDataSource } from '../../platform/typeorm';
import {
  BRANDING_SETTINGS_ID,
  DEFAULT_BRANDING,
  POWERED_BY,
} from './branding.constants';

const makeBrandingEntity = (overrides: Record<string, any> = {}) => ({
  id: BRANDING_SETTINGS_ID,
  app_name: 'TestApp',
  tagline: 'Test tagline',
  logo_url: null,
  favicon_url: null,
  primary_color: '#ff0000',
  updated_at: new Date('2026-01-01'),
  updated_by: 'user-1',
  ...overrides,
});

const makeMockRepository = (overrides: Record<string, jest.Mock> = {}) => ({
  findOne: jest.fn().mockResolvedValue(makeBrandingEntity()),
  findOneOrFail: jest.fn().mockResolvedValue(makeBrandingEntity()),
  upsert: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const buildService = (repoMock = makeMockRepository()) => {
  const dataSource = {
    getRepository: jest.fn().mockReturnValue(repoMock),
  } as any;

  return Effect.runPromise(
    BrandingService.pipe(
      Effect.provide(
        BrandingService.Default.pipe(
          Layer.provide(Layer.succeed(TypeOrmDataSource, dataSource)),
        ),
      ),
    ),
  );
};

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

describe('Effect BrandingService', () => {
  it('returns stored branding settings', async () => {
    const service = await buildService();
    const result = await run(service.get());

    expect(result).toMatchObject({
      app_name: 'TestApp',
      tagline: 'Test tagline',
      primary_color: '#ff0000',
      powered_by: POWERED_BY,
    });
  });

  it('returns default branding when no record exists', async () => {
    const repo = makeMockRepository({
      findOne: jest.fn().mockResolvedValue(null),
    } as any);
    const service = await buildService(repo);
    const result = await run(service.get());

    expect(result).toMatchObject({
      app_name: DEFAULT_BRANDING.app_name,
      powered_by: POWERED_BY,
    });
  });

  it('upserts and reloads on update', async () => {
    const repo = makeMockRepository();
    const service = await buildService(repo);

    const result = await run(
      service.update({ app_name: 'NewName' }, 'user-1'),
    );

    expect(repo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: BRANDING_SETTINGS_ID,
        app_name: 'NewName',
        updated_by: 'user-1',
      }),
      ['id'],
    );
    expect(result).toMatchObject({ app_name: 'TestApp' }); // returns reloaded entity
  });
});
