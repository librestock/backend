import { Effect } from 'effect';
import type {
  BrandingResponseDto,
  UpdateBrandingDto,
} from '@librestock/types/branding';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { BrandingSettings } from './entities/branding.entity';
import {
  BRANDING_SETTINGS_ID,
  DEFAULT_BRANDING,
  POWERED_BY,
} from './branding.constants';
import { toBrandingResponse } from './branding.utils';
import {
  BrandingInfrastructureError,
} from './branding.errors';

const brandingTryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new BrandingInfrastructureError({
        action,
        cause,
        message: `Branding service failed to ${action}`,
      }),
  });

export class BrandingService extends Effect.Service<BrandingService>()(
  '@librestock/effect/BrandingService',
  {
    effect: Effect.gen(function* () {
      const dataSource = yield* TypeOrmDataSource;
      const repository = dataSource.getRepository(BrandingSettings);

      const get = (): Effect.Effect<BrandingResponseDto, BrandingInfrastructureError> =>
        Effect.map(
          brandingTryAsync('load branding settings', () =>
            repository.findOne({
              where: { id: BRANDING_SETTINGS_ID },
            }),
          ),
          (settings) =>
            settings
              ? toBrandingResponse(settings)
              : {
                  ...DEFAULT_BRANDING,
                  powered_by: POWERED_BY,
                  updated_at: new Date(),
                },
        );

      const update = (
        dto: UpdateBrandingDto,
        userId: string,
      ): Effect.Effect<BrandingResponseDto, BrandingInfrastructureError> =>
        Effect.gen(function* () {
          yield* brandingTryAsync('upsert branding settings', () =>
            repository.upsert(
              {
                id: BRANDING_SETTINGS_ID,
                ...dto,
                updated_by: userId,
              },
              ['id'],
            ),
          );

          const settings = yield* brandingTryAsync(
            'load persisted branding settings',
            () =>
              repository.findOneOrFail({
                where: { id: BRANDING_SETTINGS_ID },
              }),
          );

          return toBrandingResponse(settings);
        });

      return { get, update };
    }),
  },
) {}
