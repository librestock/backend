import { HttpRouter, HttpServerRequest } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { Permission, Resource } from '@librestock/types/auth';
import { AuditAction, AuditEntityType } from '@librestock/types/audit-logs';
import {
  ClientIdSchema,
  ClientQuerySchema,
  CreateClientSchema,
  UpdateClientSchema,
} from './clients.schema';
import { requirePermission } from '../../platform/authorization';
import { respondJson } from '../../platform/errors';
import { AuditLogWriter } from '../../platform/audit';
import { ClientsService } from './service';

type SearchParamsInput = Readonly<Record<string, string | readonly string[] | undefined>>;

const ClientPathParams = Schema.Struct({ id: ClientIdSchema });

export const clientsRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.READ);
      const query = yield* HttpServerRequest.schemaSearchParams(
        ClientQuerySchema as unknown as Schema.Schema<
          Schema.Schema.Type<typeof ClientQuerySchema>,
          SearchParamsInput
        >,
      );
      const clientsService = yield* ClientsService;
      return yield* respondJson(clientsService.findAllPaginated(query));
    }),
  ),
  HttpRouter.get(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.READ);
      const { id } = yield* HttpRouter.schemaPathParams(ClientPathParams);
      const clientsService = yield* ClientsService;
      return yield* respondJson(clientsService.findOne(id));
    }),
  ),
  HttpRouter.post(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.WRITE);
      const dto = yield* HttpServerRequest.schemaBodyJson(CreateClientSchema);
      const clientsService = yield* ClientsService;
      const result = yield* clientsService.create(dto);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.CREATE,
        entityType: AuditEntityType.CLIENT,
        entityId: result.id,
      });
      return yield* respondJson(Effect.succeed(result), { status: 201 });
    }),
  ),
  HttpRouter.put(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.WRITE);
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
      return yield* respondJson(Effect.succeed(result));
    }),
  ),
  HttpRouter.del(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.WRITE);
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
        Effect.succeed({ message: 'Client deleted successfully' }),
      );
    }),
  ),
  HttpRouter.prefixAll('/clients'),
);
