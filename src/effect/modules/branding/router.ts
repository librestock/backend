import { HttpRouter, HttpServerRequest } from '@effect/platform';
import { Effect } from 'effect';
import { Permission, Resource } from '@librestock/types/auth';
import { UpdateBrandingSchema } from '../../../routes/branding/branding.schema';
import { BrandingUnauthorized } from '../../../routes/branding/branding.errors';
import { requirePermission } from '../../platform/authorization';
import { respondJson } from '../../platform/errors';
import { requireSession } from '../../platform/session';
import { BrandingService } from './service';

export const brandingRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    '/',
    Effect.gen(function* () {
      const brandingService = yield* BrandingService;
      return yield* respondJson(brandingService.get());
    }),
  ),
  HttpRouter.put(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.SETTINGS, Permission.WRITE);
      const dto = yield* HttpServerRequest.schemaBodyJson(UpdateBrandingSchema);
      const session = yield* requireSession;
      const userId = session.user.id;

      if (!userId) {
        return yield* respondJson(
          Effect.fail(
            new BrandingUnauthorized({
              message: 'Session user not available',
            }),
          ),
        );
      }

      const brandingService = yield* BrandingService;
      return yield* respondJson(brandingService.update(dto, userId));
    }),
  ),
  HttpRouter.prefixAll('/branding'),
);
