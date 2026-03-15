import { HttpRouter, HttpServerRequest } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { AuditAction, AuditEntityType } from '@librestock/types/audit-logs';
import { Permission, Resource } from '@librestock/types/auth';
import {
  CreateStockMovementSchema,
  StockMovementIdSchema,
  StockMovementQuerySchema,
} from '../../../routes/stock-movements/stock-movements.schema';
import { requirePermission } from '../../platform/authorization';
import { AuditLogWriter } from '../../platform/audit';
import { respondJson } from '../../platform/errors';
import { requireSession } from '../../platform/session';
import { StockMovementsService } from './service';

type SearchParamsInput = Readonly<Record<string, string | readonly string[] | undefined>>;

const StockMovementPathParams = Schema.Struct({ id: StockMovementIdSchema });
const ProductPathParams = Schema.Struct({ productId: Schema.UUID });
const LocationPathParams = Schema.Struct({ locationId: Schema.UUID });

export const stockMovementsRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.READ);
      const query = yield* HttpServerRequest.schemaSearchParams(
        StockMovementQuerySchema as unknown as Schema.Schema<
          Schema.Schema.Type<typeof StockMovementQuerySchema>,
          SearchParamsInput
        >,
      );
      const stockMovementsService = yield* StockMovementsService;
      return yield* respondJson(stockMovementsService.findAllPaginated(query));
    }),
  ),
  HttpRouter.get(
    '/product/:productId',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.READ);
      const { productId } = yield* HttpRouter.schemaPathParams(ProductPathParams);
      const stockMovementsService = yield* StockMovementsService;
      return yield* respondJson(stockMovementsService.findByProduct(productId));
    }),
  ),
  HttpRouter.get(
    '/location/:locationId',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.READ);
      const { locationId } = yield* HttpRouter.schemaPathParams(LocationPathParams);
      const stockMovementsService = yield* StockMovementsService;
      return yield* respondJson(stockMovementsService.findByLocation(locationId));
    }),
  ),
  HttpRouter.get(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.READ);
      const { id } = yield* HttpRouter.schemaPathParams(StockMovementPathParams);
      const stockMovementsService = yield* StockMovementsService;
      return yield* respondJson(stockMovementsService.findOne(id));
    }),
  ),
  HttpRouter.post(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.STOCK, Permission.WRITE);
      const dto = yield* HttpServerRequest.schemaBodyJson(CreateStockMovementSchema);
      const session = yield* requireSession;
      const stockMovementsService = yield* StockMovementsService;
      const result = yield* stockMovementsService.create(dto, session.user.id);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.CREATE,
        entityType: AuditEntityType.STOCK_MOVEMENT,
        entityId: result.id,
      });
      return yield* respondJson(Effect.succeed(result), { status: 201 });
    }),
  ),
  HttpRouter.prefixAll('/stock-movements'),
);
