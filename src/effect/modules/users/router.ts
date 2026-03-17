import { HttpRouter, HttpServerRequest } from '@effect/platform';
import { Effect, Schema } from 'effect';
import type { UserQueryDto } from '@librestock/types/users';
import { Permission, Resource } from '@librestock/types/auth';
import { toPaginatedResponse } from '../../platform/pagination.utils';
import { requirePermission } from '../../platform/authorization';
import { respondEmpty, respondJson } from '../../platform/errors';
import { getRequestHeaders } from '../../platform/session';
import {
  BanUserSchema,
  UpdateUserRolesSchema,
  UserIdSchema,
  UserQuerySchema,
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
      const query = (yield* HttpServerRequest.schemaSearchParams(
        UserQuerySchema as unknown as Schema.Schema<
          {
            readonly page: number;
            readonly limit: number;
            readonly search?: string | null | undefined;
            readonly role?: string | null | undefined;
          },
          Readonly<Record<string, string | readonly string[] | undefined>>
        >,
      )) as Schema.Schema.Type<typeof UserQuerySchema>;
      const normalizedQuery = {
        page: query.page,
        limit: query.limit,
        ...(query.search ? { search: query.search } : {}),
        ...(query.role ? { role: query.role } : {}),
      } satisfies UserQueryDto;
      const headers = yield* getRequestHeaders;
      const usersService = yield* UsersService;
      return yield* respondJson(
        Effect.map(usersService.listUsers(normalizedQuery, headers), (result) =>
          toPaginatedResponse(result, (user) => user),
        ),
      );
    }),
  ),
  HttpRouter.get(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.USERS, Permission.READ);
      const { id } = yield* HttpRouter.schemaPathParams(UserPathParamsSchema);
      const headers = yield* getRequestHeaders;
      const usersService = yield* UsersService;
      return yield* respondJson(usersService.getUser(id, headers));
    }),
  ),
  HttpRouter.put(
    '/:id/roles',
    Effect.gen(function* () {
      yield* requirePermission(Resource.USERS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(UserPathParamsSchema);
      const dto = yield* HttpServerRequest.schemaBodyJson(UpdateUserRolesSchema);
      const headers = yield* getRequestHeaders;
      const usersService = yield* UsersService;
      return yield* respondJson(
        usersService.updateRoles(id, [...dto.roles], headers),
      );
    }),
  ),
  HttpRouter.patch(
    '/:id/ban',
    Effect.gen(function* () {
      yield* requirePermission(Resource.USERS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(UserPathParamsSchema);
      const dto = yield* HttpServerRequest.schemaBodyJson(BanUserSchema);
      const headers = yield* getRequestHeaders;
      const usersService = yield* UsersService;
      return yield* respondJson(
        usersService.banUser(
          id,
          {
            reason: dto.reason,
            expiresAt: dto.expiresAt?.toISOString(),
          },
          headers,
        ),
      );
    }),
  ),
  HttpRouter.patch(
    '/:id/unban',
    Effect.gen(function* () {
      yield* requirePermission(Resource.USERS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(UserPathParamsSchema);
      const headers = yield* getRequestHeaders;
      const usersService = yield* UsersService;
      return yield* respondJson(usersService.unbanUser(id, headers));
    }),
  ),
  HttpRouter.del(
    '/:id',
    Effect.gen(function* () {
      yield* requirePermission(Resource.USERS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(UserPathParamsSchema);
      const headers = yield* getRequestHeaders;
      const usersService = yield* UsersService;
      return yield* respondEmpty(usersService.deleteUser(id, headers), {
        status: 200,
      });
    }),
  ),
  HttpRouter.post(
    '/:id/revoke-sessions',
    Effect.gen(function* () {
      yield* requirePermission(Resource.USERS, Permission.WRITE);
      const { id } = yield* HttpRouter.schemaPathParams(UserPathParamsSchema);
      const headers = yield* getRequestHeaders;
      const usersService = yield* UsersService;
      return yield* respondEmpty(usersService.revokeSessions(id, headers), {
        status: 200,
      });
    }),
  ),
  HttpRouter.prefixAll('/users'),
);
