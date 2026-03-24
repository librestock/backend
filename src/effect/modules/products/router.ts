import { HttpRouter, HttpServerRequest } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { Permission, Resource } from '@librestock/types/auth';
import { AuditAction, AuditEntityType } from '@librestock/types/audit-logs';
import { requirePermission } from '../../platform/authorization';
import { respondJson } from '../../platform/errors';
import { AuditLogWriter } from '../../platform/audit';
import { getOptionalSession } from '../../platform/session';
import { makeMessageResponse } from '../../platform/messages';
import {
  ProductIdSchema,
  ProductQuerySchema,
  ProductBooleanQuerySchema,
  CreateProductSchema,
  UpdateProductSchema,
  BulkCreateProductsSchema,
  BulkUpdateStatusSchema,
  BulkDeleteSchema,
  BulkRestoreSchema,
} from './products.schema';
import { ProductsService } from './service';

type SearchParamsInput = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

const ProductPathParams = Schema.Struct({ id: ProductIdSchema });
const CategoryPathParams = Schema.Struct({ categoryId: Schema.UUID });

const IncludeDeletedQuery = Schema.Struct({
  include_deleted: Schema.optionalWith(ProductBooleanQuerySchema, {
    default: () => false,
  }),
});

const PermanentQuery = Schema.Struct({
  permanent: Schema.optionalWith(ProductBooleanQuerySchema, {
    default: () => false,
  }),
});

export const productsRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    '/all',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.READ);
      const productsService = yield* ProductsService;
      return yield* respondJson(productsService.findAll());
    }),
  ),
  HttpRouter.get(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.READ);
      const query = yield* HttpServerRequest.schemaSearchParams(
        ProductQuerySchema as unknown as Schema.Schema<
          Schema.Schema.Type<typeof ProductQuerySchema>,
          SearchParamsInput
        >,
      );
      const productsService = yield* ProductsService;
      return yield* respondJson(productsService.findAllPaginated(query));
    }),
  ),
  HttpRouter.post(
    '/bulk',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.WRITE);
      const dto =
        yield* HttpServerRequest.schemaBodyJson(BulkCreateProductsSchema);
      const session = yield* getOptionalSession;
      const userId = session?.user.id;
      const productsService = yield* ProductsService;
      const result = yield* productsService.bulkCreate(dto, userId);
      const auditLogWriter = yield* AuditLogWriter;
      if (result.succeeded.length > 0) {
        yield* auditLogWriter.log({
          action: AuditAction.CREATE,
          entityType: AuditEntityType.PRODUCT,
          entityId: result.succeeded[0]!,
        });
      }
      return yield* respondJson(Effect.succeed(result), { status: 201 });
    }),
  ),
  HttpRouter.get(
    '/category/:categoryId/tree',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.READ);
      const { categoryId } =
        yield* HttpRouter.schemaPathParams(CategoryPathParams);
      const productsService = yield* ProductsService;
      return yield* respondJson(
        productsService.findByCategoryTree(categoryId),
      );
    }),
  ),
  HttpRouter.get(
    '/category/:categoryId',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.READ);
      const { categoryId } =
        yield* HttpRouter.schemaPathParams(CategoryPathParams);
      const productsService = yield* ProductsService;
      return yield* respondJson(productsService.findByCategory(categoryId));
    }),
  ),
  HttpRouter.post(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.WRITE);
      const dto = yield* HttpServerRequest.schemaBodyJson(CreateProductSchema);
      const session = yield* getOptionalSession;
      const userId = session?.user.id;
      const productsService = yield* ProductsService;
      const result = yield* productsService.create(dto, userId);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.CREATE,
        entityType: AuditEntityType.PRODUCT,
        entityId: result.id,
      });
      return yield* respondJson(Effect.succeed(result), { status: 201 });
    }),
  ),
  HttpRouter.patch(
    '/bulk/status',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.WRITE);
      const dto =
        yield* HttpServerRequest.schemaBodyJson(BulkUpdateStatusSchema);
      const session = yield* getOptionalSession;
      const userId = session?.user.id;
      const productsService = yield* ProductsService;
      const result = yield* productsService.bulkUpdateStatus(dto, userId);
      const auditLogWriter = yield* AuditLogWriter;
      if (result.succeeded.length > 0) {
        yield* auditLogWriter.log({
          action: AuditAction.STATUS_CHANGE,
          entityType: AuditEntityType.PRODUCT,
          entityId: result.succeeded[0]!,
        });
      }
      return yield* respondJson(Effect.succeed(result));
    }),
  ),
  HttpRouter.patch(
    '/bulk/restore',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.WRITE);
      const dto = yield* HttpServerRequest.schemaBodyJson(BulkRestoreSchema);
      const productsService = yield* ProductsService;
      const result = yield* productsService.bulkRestore(dto);
      const auditLogWriter = yield* AuditLogWriter;
      if (result.succeeded.length > 0) {
        yield* auditLogWriter.log({
          action: AuditAction.RESTORE,
          entityType: AuditEntityType.PRODUCT,
          entityId: result.succeeded[0]!,
        });
      }
      return yield* respondJson(Effect.succeed(result));
    }),
  ),
  HttpRouter.del(
    '/bulk',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.WRITE);
      const dto = yield* HttpServerRequest.schemaBodyJson(BulkDeleteSchema);
      const session = yield* getOptionalSession;
      const userId = session?.user.id;
      const productsService = yield* ProductsService;
      const result = yield* productsService.bulkDelete(dto, userId);
      const auditLogWriter = yield* AuditLogWriter;
      if (result.succeeded.length > 0) {
        yield* auditLogWriter.log({
          action: AuditAction.DELETE,
          entityType: AuditEntityType.PRODUCT,
          entityId: result.succeeded[0]!,
        });
      }
      return yield* respondJson(Effect.succeed(result));
    }),
  ),
  HttpRouter.get(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.READ);
      const { id } = yield* HttpRouter.schemaPathParams(ProductPathParams);
      const query = yield* HttpServerRequest.schemaSearchParams(
        IncludeDeletedQuery as unknown as Schema.Schema<
          Schema.Schema.Type<typeof IncludeDeletedQuery>,
          SearchParamsInput
        >,
      );
      const productsService = yield* ProductsService;
      return yield* respondJson(
        productsService.findOne(id, query.include_deleted),
      );
    }),
  ),
  HttpRouter.put(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(ProductPathParams);
      const dto = yield* HttpServerRequest.schemaBodyJson(UpdateProductSchema);
      const session = yield* getOptionalSession;
      const userId = session?.user.id;
      const productsService = yield* ProductsService;
      const result = yield* productsService.update(id, dto, userId);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PRODUCT,
        entityId: id,
      });
      return yield* respondJson(Effect.succeed(result));
    }),
  ),
  HttpRouter.patch(
    '/:id/restore',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(ProductPathParams);
      const productsService = yield* ProductsService;
      const result = yield* productsService.restore(id);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.RESTORE,
        entityType: AuditEntityType.PRODUCT,
        entityId: id,
      });
      return yield* respondJson(Effect.succeed(result));
    }),
  ),
  HttpRouter.del(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(ProductPathParams);
      const query = yield* HttpServerRequest.schemaSearchParams(
        PermanentQuery as unknown as Schema.Schema<
          Schema.Schema.Type<typeof PermanentQuery>,
          SearchParamsInput
        >,
      );
      const session = yield* getOptionalSession;
      const userId = session?.user.id;
      const productsService = yield* ProductsService;
      yield* productsService.delete(id, userId, query.permanent);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.DELETE,
        entityType: AuditEntityType.PRODUCT,
        entityId: id,
      });
      return yield* respondJson(
        Effect.succeed(
          makeMessageResponse(
            query.permanent ? 'products.deletedPermanent' : 'products.deleted',
          ),
        ),
      );
    }),
  ),
  HttpRouter.prefixAll('/products'),
);
