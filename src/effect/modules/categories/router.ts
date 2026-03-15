import { HttpRouter, HttpServerRequest } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { Permission, Resource } from '@librestock/types/auth';
import { AuditAction, AuditEntityType } from '@librestock/types/audit-logs';
import {
  CategoryIdSchema,
  CreateCategorySchema,
  UpdateCategorySchema,
} from '../../../routes/categories/categories.schema';
import { requirePermission } from '../../platform/authorization';
import { respondJson } from '../../platform/errors';
import { AuditLogWriter } from '../../platform/audit';
import { CategoriesService } from './service';

const CategoryPathParams = Schema.Struct({ id: CategoryIdSchema });

export const categoriesRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.READ);
      const categoriesService = yield* CategoriesService;
      return yield* respondJson(categoriesService.findAll());
    }),
  ),
  HttpRouter.post(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.WRITE);
      const dto = yield* HttpServerRequest.schemaBodyJson(CreateCategorySchema);
      const categoriesService = yield* CategoriesService;
      const result = yield* categoriesService.create(dto);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.CREATE,
        entityType: AuditEntityType.CATEGORY,
        entityId: result.id,
      });
      return yield* respondJson(Effect.succeed(result), { status: 201 });
    }),
  ),
  HttpRouter.put(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(CategoryPathParams);
      const dto = yield* HttpServerRequest.schemaBodyJson(UpdateCategorySchema);
      const categoriesService = yield* CategoriesService;
      const result = yield* categoriesService.update(id, dto);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.CATEGORY,
        entityId: id,
      });
      return yield* respondJson(Effect.succeed(result));
    }),
  ),
  HttpRouter.del(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.PRODUCTS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(CategoryPathParams);
      const categoriesService = yield* CategoriesService;
      yield* categoriesService.delete(id);
      const auditLogWriter = yield* AuditLogWriter;
      yield* auditLogWriter.log({
        action: AuditAction.DELETE,
        entityType: AuditEntityType.CATEGORY,
        entityId: id,
      });
      return yield* respondJson(
        Effect.succeed({ message: 'Category deleted successfully' }),
      );
    }),
  ),
  HttpRouter.prefixAll('/categories'),
);
