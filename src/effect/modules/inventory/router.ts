import { HttpRouter, HttpServerRequest } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { AuditAction, AuditEntityType } from '@librestock/types/audit-logs';
import { Permission, Resource } from '@librestock/types/auth';
import {
  InventoryIdSchema,
  InventoryQuerySchema,
} from '@librestock/types/inventory';
import { requirePermission } from '../../platform/authorization';
import { AuditLogWriter } from '../../platform/audit';
import { respondJson } from '../../platform/errors';
import { makeMessageResponse } from '../../platform/messages';
import {
  AdjustInventorySchema,
  CreateInventorySchema,
  UpdateInventorySchema,
} from './inventory.schema';
import { InventoryService } from './service';

const InventoryPathParams = Schema.Struct({ id: InventoryIdSchema });
const ProductPathParams = Schema.Struct({ productId: Schema.UUID });
const LocationPathParams = Schema.Struct({ locationId: Schema.UUID });

export const inventoryRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.READ);
      const query = yield* HttpServerRequest.schemaSearchParams(InventoryQuerySchema);
      const inventoryService = yield* InventoryService;
      return yield* respondJson(inventoryService.findAllPaginated(query));
    }),
  ),
  HttpRouter.get(
    '/all',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.READ);
      const inventoryService = yield* InventoryService;
      return yield* respondJson(inventoryService.findAll());
    }),
  ),
  HttpRouter.get(
    '/product/:productId',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.READ);
      const { productId } = yield* HttpRouter.schemaPathParams(ProductPathParams);
      const inventoryService = yield* InventoryService;
      return yield* respondJson(inventoryService.findByProduct(productId));
    }),
  ),
  HttpRouter.get(
    '/location/:locationId',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.READ);
      const { locationId } = yield* HttpRouter.schemaPathParams(LocationPathParams);
      const inventoryService = yield* InventoryService;
      return yield* respondJson(inventoryService.findByLocation(locationId));
    }),
  ),
  HttpRouter.get(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.READ);
      const { id } = yield* HttpRouter.schemaPathParams(InventoryPathParams);
      const inventoryService = yield* InventoryService;
      return yield* respondJson(inventoryService.findOne(id));
    }),
  ),
  HttpRouter.post(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.WRITE);
      const dto = yield* HttpServerRequest.schemaBodyJson(CreateInventorySchema);
      const inventoryService = yield* InventoryService;
      const result = yield* inventoryService.create(dto);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.CREATE,
        entityType: AuditEntityType.INVENTORY,
        entityId: result.id,
      });
      return yield* respondJson(Effect.succeed(result), { status: 201 });
    }),
  ),
  HttpRouter.put(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(InventoryPathParams);
      const dto = yield* HttpServerRequest.schemaBodyJson(UpdateInventorySchema);
      const inventoryService = yield* InventoryService;
      const result = yield* inventoryService.update(id, dto);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.INVENTORY,
        entityId: id,
      });
      return yield* respondJson(Effect.succeed(result));
    }),
  ),
  HttpRouter.patch(
    '/:id/adjust',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(InventoryPathParams);
      const dto = yield* HttpServerRequest.schemaBodyJson(AdjustInventorySchema);
      const inventoryService = yield* InventoryService;
      const result = yield* inventoryService.adjustQuantity(id, dto);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.ADJUST_QUANTITY,
        entityType: AuditEntityType.INVENTORY,
        entityId: id,
      });
      return yield* respondJson(Effect.succeed(result));
    }),
  ),
  HttpRouter.del(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(InventoryPathParams);
      const inventoryService = yield* InventoryService;
      yield* inventoryService.delete(id);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.DELETE,
        entityType: AuditEntityType.INVENTORY,
        entityId: id,
      });
      return yield* respondJson(
        Effect.succeed(makeMessageResponse('inventory.deleted')),
      );
    }),
  ),
  HttpRouter.prefixAll('/inventory'),
);
