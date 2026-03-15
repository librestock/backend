import { Context, Layer } from 'effect';
import { makeHealthService, type HealthService as HealthServiceApi } from './service';

export const HealthService = Context.GenericTag<HealthServiceApi>(
  '@librestock/effect/HealthService',
);

export const healthLayer = Layer.succeed(HealthService, makeHealthService());
