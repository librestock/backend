import { Context, Effect } from 'effect';
import { Repository } from 'typeorm';
import type {
  BrandingResponseDto,
  UpdateBrandingDto,
} from '@librestock/types/branding';
import { BrandingSettings } from '../../../routes/branding/entities/branding.entity';
import {
  BRANDING_SETTINGS_ID,
  DEFAULT_BRANDING,
  POWERED_BY,
} from '../../../routes/branding/branding.constants';
import { toBrandingResponse } from '../../../routes/branding/branding.utils';
import {
  BrandingInfrastructureError,
} from '../../../routes/branding/branding.errors';
import { TypeOrmDataSource } from '../../platform/typeorm';

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

export interface BrandingService {
  readonly get: () => Effect.Effect<BrandingResponseDto, BrandingInfrastructureError>;
  readonly update: (
    dto: UpdateBrandingDto,
    userId: string,
  ) => Effect.Effect<BrandingResponseDto, BrandingInfrastructureError>;
}

export const BrandingService = Context.GenericTag<BrandingService>(
  '@librestock/effect/BrandingService',
);

const createBrandingService = (
  repository: Repository<BrandingSettings>,
): BrandingService => ({
  get: () =>
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
    ),
  update: (dto, userId) =>
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
    }),
});

export const makeBrandingService = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;

  return createBrandingService(dataSource.getRepository(BrandingSettings));
});
