import { HttpApi, OpenApi } from '@effect/platform';
import { HealthApi } from '../modules/health/api';

/**
 * The root typed API definition.
 *
 * Additional groups (modules) are added here as they migrate to HttpApiBuilder.
 * Legacy modules remain on the HttpRouter in app.ts until they are migrated.
 */
export class AppApi extends HttpApi.make('app')
  .add(HealthApi)
  .annotate(OpenApi.Title, 'LibreStock API')
  .annotate(
    OpenApi.Description,
    'LibreStock inventory management API. Only routes migrated to HttpApiBuilder appear here; legacy routes are documented separately.',
  ) {}
