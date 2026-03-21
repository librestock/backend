import { HttpRouter, HttpServerRequest } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { Permission, Resource } from '@librestock/types/auth';
import { AuditAction, AuditEntityType } from '@librestock/types/audit-logs';
import {
  SupplierIdSchema,
  SupplierQuerySchema,
} from '@librestock/types/suppliers';
import { requirePermission } from '../../platform/authorization';
import { respondJson } from '../../platform/errors';
import { AuditLogWriter } from '../../platform/audit';
import {
  CreateSupplierSchema,
  UpdateSupplierSchema,
} from './suppliers.schema';
import { SuppliersService } from './service';

const SupplierPathParams = Schema.Struct({ id: SupplierIdSchema });

export const suppliersRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.READ);
      const query = yield* HttpServerRequest.schemaSearchParams(SupplierQuerySchema);
      const suppliersService = yield* SuppliersService;
      return yield* respondJson(suppliersService.findAllPaginated(query));
    }),
  ),
  HttpRouter.get(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.READ);
      const { id } = yield* HttpRouter.schemaPathParams(SupplierPathParams);
      const suppliersService = yield* SuppliersService;
      return yield* respondJson(suppliersService.findOne(id));
    }),
  ),
  HttpRouter.post(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.WRITE);
      const dto = yield* HttpServerRequest.schemaBodyJson(CreateSupplierSchema);
      const suppliersService = yield* SuppliersService;
      const result = yield* suppliersService.create(dto);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.CREATE,
        entityType: AuditEntityType.SUPPLIER,
        entityId: result.id,
      });
      return yield* respondJson(Effect.succeed(result), { status: 201 });
    }),
  ),
  HttpRouter.put(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(SupplierPathParams);
      const dto = yield* HttpServerRequest.schemaBodyJson(UpdateSupplierSchema);
      const suppliersService = yield* SuppliersService;
      const result = yield* suppliersService.update(id, dto);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.SUPPLIER,
        entityId: id,
      });
      return yield* respondJson(Effect.succeed(result));
    }),
  ),
  HttpRouter.del(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(SupplierPathParams);
      const suppliersService = yield* SuppliersService;
      yield* suppliersService.delete(id);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.DELETE,
        entityType: AuditEntityType.SUPPLIER,
        entityId: id,
      });
      return yield* respondJson(
        Effect.succeed({ message: 'Supplier deleted successfully' }),
      );
    }),
  ),
  HttpRouter.prefixAll('/suppliers'),
);
