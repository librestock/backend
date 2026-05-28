import { HttpRouter, HttpServerRequest } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { Permission, Resource } from '@stocket/types/auth';
import { AuditAction, AuditEntityType } from '@stocket/types/audit-logs';
import {
  ClientIdSchema,
  ClientQuerySchema,
  CreateClientSchema,
  UpdateClientSchema,
} from '@stocket/types/clients';
import { requirePermission } from '../../platform/authorization';
import { respondJson, respondJsonOk } from '../../platform/errors';
import { AuditLogWriter } from '../../platform/audit';
import { makeMessageResponse } from '../../platform/messages';
import { ClientsService } from './service';

const ClientPathParams = Schema.Struct({ id: ClientIdSchema });

export const clientsRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.CLIENTS, Permission.READ);
      const query = yield* HttpServerRequest.schemaSearchParams(ClientQuerySchema);
      const clientsService = yield* ClientsService;
      return yield* respondJson(clientsService.findAllPaginated(query));
    }),
  ),
  HttpRouter.get(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.CLIENTS, Permission.READ);
      const { id } = yield* HttpRouter.schemaPathParams(ClientPathParams);
      const clientsService = yield* ClientsService;
      return yield* respondJson(clientsService.findOne(id));
    }),
  ),
  HttpRouter.post(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.CLIENTS, Permission.WRITE);
      const dto = yield* HttpServerRequest.schemaBodyJson(CreateClientSchema);
      const clientsService = yield* ClientsService;
      const result = yield* clientsService.create(dto);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.CREATE,
        entityType: AuditEntityType.CLIENT,
        entityId: result.id,
      });
      return yield* respondJsonOk(result, { status: 201 });
    }),
  ),
  HttpRouter.put(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.CLIENTS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(ClientPathParams);
      const dto = yield* HttpServerRequest.schemaBodyJson(UpdateClientSchema);
      const clientsService = yield* ClientsService;
      const result = yield* clientsService.update(id, dto);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.CLIENT,
        entityId: id,
      });
      return yield* respondJsonOk(result);
    }),
  ),
  HttpRouter.del(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.CLIENTS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(ClientPathParams);
      const clientsService = yield* ClientsService;
      yield* clientsService.delete(id);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.DELETE,
        entityType: AuditEntityType.CLIENT,
        entityId: id,
      });
      return yield* respondJson(
        Effect.succeed(makeMessageResponse('clients.deleted')),
      );
    }),
  ),
  HttpRouter.prefixAll('/clients'),
);
