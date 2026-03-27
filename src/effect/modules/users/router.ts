import { HttpRouter, HttpServerRequest } from '@effect/platform';
import { Effect, Schema } from 'effect';
import type { UserQueryDto } from '@librestock/types/users';
import { Permission, Resource } from '@librestock/types/auth';
import {
  UserIdSchema,
  UserQuerySchema,
} from '@librestock/types/users';
import { toPaginatedResponse } from '../../platform/pagination.utils';
import { requirePermission } from '../../platform/authorization';
import { respondEmpty, respondJson } from '../../platform/errors';
import { BetterAuthHeaders } from '../../platform/better-auth';
import { getRequestHeaders } from '../../platform/session';
import {
  BanUserSchema,
  UpdateUserRolesSchema,
} from './users.schema';
import { UsersService } from './service';

const UserPathParamsSchema = Schema.Struct({
  id: UserIdSchema,
});

export const usersRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    '/',
    Effect.gen(function* () {
      yield* requirePermission(Resource.USERS, Permission.READ);
      const query = yield* HttpServerRequest.schemaSearchParams(UserQuerySchema);
      const normalizedQuery = {
        page: query.page,
        limit: query.limit,
        ...(query.search ? { search: query.search } : {}),
        ...(query.role ? { role: query.role } : {}),
      } satisfies UserQueryDto;
      const requestHeaders = yield* getRequestHeaders;
      const usersService = yield* UsersService;
      return yield* respondJson(
        Effect.map(
          usersService.listUsers(normalizedQuery).pipe(
            Effect.provideService(BetterAuthHeaders, requestHeaders),
          ),
          (result) => toPaginatedResponse(result, (user) => user),
        ),
      );
    }),
  ),
  HttpRouter.get(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.USERS, Permission.READ);
      const { id } = yield* HttpRouter.schemaPathParams(UserPathParamsSchema);
      const requestHeaders = yield* getRequestHeaders;
      const usersService = yield* UsersService;
      return yield* respondJson(
        usersService.getUser(id).pipe(
          Effect.provideService(BetterAuthHeaders, requestHeaders),
        ),
      );
    }),
  ),
  HttpRouter.put(
    '/:id/roles',
    Effect.gen(function* () {
      yield* requirePermission(Resource.USERS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(UserPathParamsSchema);
      const dto = yield* HttpServerRequest.schemaBodyJson(UpdateUserRolesSchema);
      const requestHeaders = yield* getRequestHeaders;
      const usersService = yield* UsersService;
      return yield* respondJson(
        usersService.updateRoles(id, [...dto.roles]).pipe(
          Effect.provideService(BetterAuthHeaders, requestHeaders),
        ),
      );
    }),
  ),
  HttpRouter.patch(
    '/:id/ban',
    Effect.gen(function* () {
      yield* requirePermission(Resource.USERS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(UserPathParamsSchema);
      const dto = yield* HttpServerRequest.schemaBodyJson(BanUserSchema);
      const requestHeaders = yield* getRequestHeaders;
      const usersService = yield* UsersService;
      return yield* respondJson(
        usersService.banUser(
          id,
          {
            reason: dto.reason,
            expiresAt: dto.expiresAt?.toISOString(),
          },
        ).pipe(Effect.provideService(BetterAuthHeaders, requestHeaders)),
      );
    }),
  ),
  HttpRouter.patch(
    '/:id/unban',
    Effect.gen(function* () {
      yield* requirePermission(Resource.USERS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(UserPathParamsSchema);
      const requestHeaders = yield* getRequestHeaders;
      const usersService = yield* UsersService;
      return yield* respondJson(
        usersService.unbanUser(id).pipe(
          Effect.provideService(BetterAuthHeaders, requestHeaders),
        ),
      );
    }),
  ),
  HttpRouter.del(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.USERS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(UserPathParamsSchema);
      const requestHeaders = yield* getRequestHeaders;
      const usersService = yield* UsersService;
      return yield* respondEmpty(
        usersService.deleteUser(id).pipe(
          Effect.provideService(BetterAuthHeaders, requestHeaders),
        ),
        {
          status: 200,
        },
      );
    }),
  ),
  HttpRouter.post(
    '/:id/revoke-sessions',
    Effect.gen(function* () {
      yield* requirePermission(Resource.USERS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(UserPathParamsSchema);
      const requestHeaders = yield* getRequestHeaders;
      const usersService = yield* UsersService;
      return yield* respondEmpty(
        usersService.revokeSessions(id).pipe(
          Effect.provideService(BetterAuthHeaders, requestHeaders),
        ),
        {
          status: 200,
        },
      );
    }),
  ),
  HttpRouter.prefixAll('/users'),
);
