import { Effect, Layer } from 'effect';
import { DrizzleDatabase } from '../../platform/drizzle';
import { BrandingService } from './service';
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

const createChainableMock = (resolveValue: any) => {
  const chain: any = {};
  const methods = ['select', 'from', 'where', 'limit', 'insert', 'values', 'onConflictDoUpdate', 'orderBy', 'offset'];
  for (const method of methods) {
    chain[method] = jest.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve(resolveValue);
  return chain;
};

const buildService = (mockDb: any) =>
  Effect.runPromise(
    BrandingService.pipe(
      Effect.provide(
        BrandingService.Default.pipe(
          Layer.provide(Layer.succeed(DrizzleDatabase, mockDb)),
        ),
      ),
    ),
  );

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

describe('Effect BrandingService', () => {
  it('returns stored branding settings', async () => {
    const entity = makeBrandingEntity();
    const mockDb = createChainableMock([entity]);
    const service = await buildService(mockDb);
    const result = await run(service.get());

    expect(result).toMatchObject({
      app_name: 'TestApp',
      tagline: 'Test tagline',
      primary_color: '#ff0000',
      powered_by: POWERED_BY,
    });
  });

  it('returns default branding when no record exists', async () => {
    const mockDb = createChainableMock([]);
    const service = await buildService(mockDb);
    const result = await run(service.get());

    expect(result).toMatchObject({
      app_name: DEFAULT_BRANDING.app_name,
      powered_by: POWERED_BY,
    });
  });

  it('upserts and reloads on update', async () => {
    const entity = makeBrandingEntity();
    // The mock db needs to handle both insert chain and select chain.
    // Since the service calls insert().values().onConflictDoUpdate() then
    // select().from().where().limit(), we create a mock that resolves
    // to undefined for insert and to [entity] for select.
    const selectChain = createChainableMock([entity]);
    const insertChain = createChainableMock(undefined);

    const mockDb: any = {
      select: jest.fn().mockImplementation(() => {
        return selectChain;
      }),
      insert: jest.fn().mockReturnValue(insertChain),
    };

    const service = await buildService(mockDb);
    const result = await run(
      service.update({ app_name: 'NewName' }, 'user-1'),
    );

    expect(mockDb.insert).toHaveBeenCalled();
    expect(insertChain.values).toHaveBeenCalled();
    expect(insertChain.onConflictDoUpdate).toHaveBeenCalled();
    expect(result).toMatchObject({ app_name: 'TestApp' }); // returns reloaded entity
  });
});
