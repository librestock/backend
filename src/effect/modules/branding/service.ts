import { Effect } from 'effect';
import { eq } from 'drizzle-orm';
import type {
  BrandingResponseDto,
  UpdateBrandingDto,
} from '@librestock/types/branding';
import { DrizzleDatabase } from '../../platform/drizzle';
import { brandingSettings } from '../../platform/db/schema';
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
        messageKey: 'branding.repositoryFailed',
      }),
  });

export class BrandingService extends Effect.Service<BrandingService>()(
  '@librestock/effect/BrandingService',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const get = (): Effect.Effect<BrandingResponseDto, BrandingInfrastructureError> =>
        Effect.map(
          brandingTryAsync('load branding settings', async () => {
            const rows = await db
              .select()
              .from(brandingSettings)
              .where(eq(brandingSettings.id, BRANDING_SETTINGS_ID))
              .limit(1);
            return rows[0] ?? null;
          }),
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
            db
              .insert(brandingSettings)
              .values({
                id: BRANDING_SETTINGS_ID,
                app_name: dto.app_name ?? DEFAULT_BRANDING.app_name,
                tagline: dto.tagline ?? DEFAULT_BRANDING.tagline,
                primary_color: dto.primary_color ?? DEFAULT_BRANDING.primary_color,
                ...dto,
                updated_by: userId,
                updated_at: new Date(),
              })
              .onConflictDoUpdate({
                target: brandingSettings.id,
                set: {
                  ...dto,
                  updated_by: userId,
                  updated_at: new Date(),
                },
              }),
          );

          const rows = yield* brandingTryAsync(
            'load persisted branding settings',
            () =>
              db
                .select()
                .from(brandingSettings)
                .where(eq(brandingSettings.id, BRANDING_SETTINGS_ID))
                .limit(1),
          );

          if (!rows[0]) {
            throw new Error('Branding settings not found after upsert');
          }

          return toBrandingResponse(rows[0]);
        });

      return { get, update };
    }),
  },
) {}
