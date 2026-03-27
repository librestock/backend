import { HttpApi } from '@effect/platform';
import { HealthApi } from '../modules/health/api';

/**
 * The root typed API definition.
 *
 * Additional groups (modules) are added here as they migrate to HttpApiBuilder.
 * Legacy modules remain on the HttpRouter in app.ts until they are migrated.
 */
export class AppApi extends HttpApi.make('app').add(HealthApi) {}
