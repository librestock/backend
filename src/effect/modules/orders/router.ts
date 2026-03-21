import { HttpRouter, HttpServerRequest } from '@effect/platform';
import { Effect, Schema } from 'effect';
import {
  CreateOrderSchema,
  OrderIdSchema,
  OrderQuerySchema,
  UpdateOrderSchema,
  UpdateOrderStatusSchema,
} from '@librestock/types/orders';
import { Permission, Resource } from '@librestock/types/auth';
import { AuditAction, AuditEntityType } from '@librestock/types/audit-logs';
import { requirePermission } from '../../platform/authorization';
import { respondJson } from '../../platform/errors';
import { AuditLogWriter } from '../../platform/audit';
import { getOptionalSession } from '../../platform/session';
import { OrdersService } from './service';

const OrderPathParams = Schema.Struct({ id: OrderIdSchema });

export const ordersRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.READ);
      const query = yield* HttpServerRequest.schemaSearchParams(OrderQuerySchema);
      const ordersService = yield* OrdersService;
      return yield* respondJson(ordersService.findAllPaginated(query));
    }),
  ),
  HttpRouter.get(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.READ);
      const { id } = yield* HttpRouter.schemaPathParams(OrderPathParams);
      const ordersService = yield* OrdersService;
      return yield* respondJson(ordersService.findOne(id));
    }),
  ),
  HttpRouter.post(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.WRITE);
      const dto = yield* HttpServerRequest.schemaBodyJson(CreateOrderSchema);
      const session = yield* getOptionalSession;
      const ordersService = yield* OrdersService;
      const result = yield* ordersService.create(dto, session?.user.id ?? '');
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.CREATE,
        entityType: AuditEntityType.ORDER,
        entityId: result.id,
      });
      return yield* respondJson(Effect.succeed(result), { status: 201 });
    }),
  ),
  HttpRouter.put(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(OrderPathParams);
      const dto = yield* HttpServerRequest.schemaBodyJson(UpdateOrderSchema);
      const ordersService = yield* OrdersService;
      const result = yield* ordersService.update(id, dto);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.ORDER,
        entityId: id,
      });
      return yield* respondJson(Effect.succeed(result));
    }),
  ),
  HttpRouter.patch(
    '/:id/status',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(OrderPathParams);
      const dto = yield* HttpServerRequest.schemaBodyJson(
        UpdateOrderStatusSchema,
      );
      const ordersService = yield* OrdersService;
      const result = yield* ordersService.updateStatus(id, dto);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.STATUS_CHANGE,
        entityType: AuditEntityType.ORDER,
        entityId: id,
      });
      return yield* respondJson(Effect.succeed(result));
    }),
  ),
  HttpRouter.del(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(OrderPathParams);
      const ordersService = yield* OrdersService;
      yield* ordersService.delete(id);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.DELETE,
        entityType: AuditEntityType.ORDER,
        entityId: id,
      });
      return yield* respondJson(
        Effect.succeed({ message: 'Order deleted successfully' }),
      );
    }),
  ),
  HttpRouter.prefixAll('/orders'),
);
