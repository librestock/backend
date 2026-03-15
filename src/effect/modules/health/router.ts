import { HttpRouter } from '@effect/platform';
import { Effect } from 'effect';
import { respondJson } from '../../platform/errors';
import { HealthService } from './service';

export const healthRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    '/health-check',
    Effect.gen(function* () {
      const service = yield* HealthService;
      const response = yield* service.healthCheck;
      return yield* respondJson(Effect.succeed(response), {
        status: response.status === 'ok' ? 200 : 503,
      });
    }),
  ),
  HttpRouter.get(
    '/health-check/live',
    Effect.gen(function* () {
      const service = yield* HealthService;
      return yield* respondJson(service.live, {
        status: 200,
      });
    }),
  ),
  HttpRouter.get(
    '/health-check/ready',
    Effect.gen(function* () {
      const service = yield* HealthService;
      const response = yield* service.ready;
      return yield* respondJson(Effect.succeed(response), {
        status: response.status === 'ok' ? 200 : 503,
      });
    }),
  ),
);
