import { HttpRouter, HttpServerRequest } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { Permission, Resource } from '@librestock/types/auth';
import { AuditAction, AuditEntityType } from '@librestock/types/audit-logs';
import {
  LocationIdSchema,
  LocationQuerySchema,
} from '@librestock/types/locations';
import { requirePermission } from '../../platform/authorization';
import { respondJson } from '../../platform/errors';
import { AuditLogWriter } from '../../platform/audit';
import { makeMessageResponse } from '../../platform/messages';
import {
  CreateLocationSchema,
  UpdateLocationSchema,
} from './locations.schema';
import { LocationsService } from './service';

const LocationPathParams = Schema.Struct({ id: LocationIdSchema });

export const locationsRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    '/all',
    Effect.gen(function* () {
      yield* requirePermission(Resource.LOCATIONS, Permission.READ);
      const locationsService = yield* LocationsService;
      return yield* respondJson(locationsService.findAll());
    }),
  ),
  HttpRouter.get(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.LOCATIONS, Permission.READ);
      const query = yield* HttpServerRequest.schemaSearchParams(LocationQuerySchema);
      const locationsService = yield* LocationsService;
      return yield* respondJson(locationsService.findAllPaginated(query));
    }),
  ),
  HttpRouter.get(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.LOCATIONS, Permission.READ);
      const { id } = yield* HttpRouter.schemaPathParams(LocationPathParams);
      const locationsService = yield* LocationsService;
      return yield* respondJson(locationsService.findOne(id));
    }),
  ),
  HttpRouter.post(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.LOCATIONS, Permission.WRITE);
      const dto = yield* HttpServerRequest.schemaBodyJson(CreateLocationSchema);
      const locationsService = yield* LocationsService;
      const result = yield* locationsService.create(dto);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.CREATE,
        entityType: AuditEntityType.LOCATION,
        entityId: result.id,
      });
      return yield* respondJson(Effect.succeed(result), { status: 201 });
    }),
  ),
  HttpRouter.put(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.LOCATIONS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(LocationPathParams);
      const dto = yield* HttpServerRequest.schemaBodyJson(UpdateLocationSchema);
      const locationsService = yield* LocationsService;
      const result = yield* locationsService.update(id, dto);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.LOCATION,
        entityId: id,
      });
      return yield* respondJson(Effect.succeed(result));
    }),
  ),
  HttpRouter.del(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.LOCATIONS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(LocationPathParams);
      const locationsService = yield* LocationsService;
      yield* locationsService.delete(id);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.DELETE,
        entityType: AuditEntityType.LOCATION,
        entityId: id,
      });
      return yield* respondJson(
        Effect.succeed(makeMessageResponse('locations.deleted')),
      );
    }),
  ),
  HttpRouter.prefixAll('/locations'),
);
