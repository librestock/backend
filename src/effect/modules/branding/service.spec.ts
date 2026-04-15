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
    chain[method] = vi.fn().mockReturnValue(chain);
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
    // Service calls insert(...).onConflictDoUpdate(...) then select(...).limit().
    const selectChain = createChainableMock([entity]);
    const insertChain = createChainableMock(undefined);

    const mockDb: any = {
      select: vi.fn().mockImplementation(() => {
        return selectChain;
      }),
      insert: vi.fn().mockReturnValue(insertChain),
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
