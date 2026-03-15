import { Context, Effect } from 'effect';
import type { UserQueryDto } from '../../../routes/users/dto/user-query.dto';
import type { UserResponseDto } from '../../../routes/users/dto/user-response.dto';
import type { BanUserDto } from '../../../routes/users/dto/ban-user.dto';
import { UserNotFound, UsersInfrastructureError } from '../../../routes/users/users.errors';
import { userTryAsync } from '../../../routes/users/users.utils';
import { BetterAuth } from '../../platform/better-auth';
import { RolesService } from '../roles/service';
import { UsersRepository } from './repository';

interface PaginatedUsers {
  readonly data: UserResponseDto[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly total_pages: number;
}

const toUserResponse = (
  user: Record<string, any>,
  roles: string[],
): UserResponseDto => ({
  id: user.id,
  name: user.name ?? '',
  email: user.email ?? '',
  image: user.image ?? null,
  roles,
  banned: user.banned ?? false,
  banReason: user.banReason ?? null,
  banExpires: user.banExpires ?? null,
  createdAt: user.createdAt,
});

export interface UsersService {
  readonly listUsers: (
    query: UserQueryDto,
    headers: Headers,
  ) => Effect.Effect<PaginatedUsers, UsersInfrastructureError>;
  readonly getUser: (
    id: string,
    headers: Headers,
  ) => Effect.Effect<UserResponseDto, UserNotFound | UsersInfrastructureError>;
  readonly updateRoles: (
    userId: string,
    roleIds: string[],
    headers: Headers,
  ) => Effect.Effect<UserResponseDto, UserNotFound | UsersInfrastructureError>;
  readonly banUser: (
    userId: string,
    dto: BanUserDto,
    headers: Headers,
  ) => Effect.Effect<UserResponseDto, UserNotFound | UsersInfrastructureError>;
  readonly unbanUser: (
    userId: string,
    headers: Headers,
  ) => Effect.Effect<UserResponseDto, UserNotFound | UsersInfrastructureError>;
  readonly deleteUser: (
    userId: string,
    headers: Headers,
  ) => Effect.Effect<void, UserNotFound | UsersInfrastructureError>;
  readonly revokeSessions: (
    userId: string,
    headers: Headers,
  ) => Effect.Effect<void, UserNotFound | UsersInfrastructureError>;
}

export const UsersService = Context.GenericTag<UsersService>(
  '@librestock/effect/UsersService',
);

const getBetterAuthUserOrFail = (
  api: typeof import('../../../auth').auth.api,
  id: string,
  headers: Headers,
): Effect.Effect<Record<string, any>, UserNotFound | UsersInfrastructureError> =>
  Effect.flatMap(
    userTryAsync('load user from auth provider', () =>
      api.listUsers({
        headers,
        query: {
          limit: 1,
          offset: 0,
          filterField: 'id',
          filterValue: id,
        },
      }),
    ),
    (result) => {
      const user = (result.users ?? [])[0] as Record<string, any> | undefined;
      return user
        ? Effect.succeed(user)
        : Effect.fail(
            new UserNotFound({
              id,
              message: `User with ID ${id} not found`,
            }),
          );
    },
  );

export const makeUsersService = Effect.gen(function* () {
  const betterAuth = yield* BetterAuth;
  const usersRepository = yield* UsersRepository;
  const rolesService = yield* RolesService;

  const getUser = (
    id: string,
    headers: Headers,
  ): Effect.Effect<UserResponseDto, UserNotFound | UsersInfrastructureError> =>
    Effect.gen(function* () {
      const user = yield* getBetterAuthUserOrFail(betterAuth.api, id, headers);
      const roleEntities = yield* userTryAsync('load user roles', () =>
        usersRepository.findUserRoles(id),
      );

      return toUserResponse(
        user,
        roleEntities.map((roleEntity) => roleEntity.role.name),
      );
    });

  const service: UsersService = {
    listUsers: (query, headers) =>
      Effect.gen(function* () {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const offset = (page - 1) * limit;

        const searchQuery: Record<string, string> = {};
        if (query.search) {
          searchQuery.searchField = 'name';
          searchQuery.searchValue = query.search;
          searchQuery.searchOperator = 'contains';
        }

        const result = yield* userTryAsync('list users from auth provider', () =>
          betterAuth.api.listUsers({
            headers,
            query: {
              limit,
              offset,
              ...searchQuery,
            },
          }),
        );

        const users = (result.users ?? []) as Record<string, any>[];
        const total = result.total ?? users.length;
        const assignments = yield* userTryAsync('load user role assignments', () =>
          usersRepository.findRoleAssignments(users.map((user) => user.id)),
        );

        const rolesByUserId = new Map<string, string[]>();
        for (const assignment of assignments) {
          const roleNames = rolesByUserId.get(assignment.user_id) ?? [];
          roleNames.push(assignment.role.name);
          rolesByUserId.set(assignment.user_id, roleNames);
        }

        let data = users.map((user) =>
          toUserResponse(user, rolesByUserId.get(user.id) ?? []),
        );

        if (query.role) {
          data = data.filter((user) => user.roles.includes(query.role!));
        }

        const filteredTotal = query.role ? data.length : total;

        return {
          data,
          total: filteredTotal,
          page,
          limit,
          total_pages: Math.ceil(filteredTotal / limit),
        };
      }),
    getUser,
    updateRoles: (userId, roleIds, headers) =>
      Effect.gen(function* () {
        yield* getBetterAuthUserOrFail(betterAuth.api, userId, headers);
        yield* userTryAsync('replace user role assignments', () =>
          usersRepository.replaceUserRoles(userId, roleIds),
        );

        const hasAdminRole = yield* userTryAsync('check admin role assignment', () =>
          usersRepository.hasAdminRole(roleIds),
        );

        yield* userTryAsync('sync better auth role column', () =>
          usersRepository.syncBetterAuthRole(
            userId,
            hasAdminRole ? 'admin' : 'user',
          ),
        );

        yield* rolesService.clearCacheForUser(userId);

        return yield* getUser(userId, headers);
      }),
    banUser: (userId, dto, headers) =>
      Effect.gen(function* () {
        yield* getBetterAuthUserOrFail(betterAuth.api, userId, headers);

        const body: Record<string, unknown> = { userId };
        if (dto.reason) {
          body.banReason = dto.reason;
        }
        if (dto.expiresAt) {
          body.banExpiresIn = Math.max(
            0,
            Math.floor((new Date(dto.expiresAt).getTime() - Date.now()) / 1000),
          );
        }

        yield* userTryAsync('ban user in auth provider', () =>
          betterAuth.api.banUser({
            headers,
            body: body as any,
          }),
        );

        return yield* getUser(userId, headers);
      }),
    unbanUser: (userId, headers) =>
      Effect.gen(function* () {
        yield* getBetterAuthUserOrFail(betterAuth.api, userId, headers);
        yield* userTryAsync('unban user in auth provider', () =>
          betterAuth.api.unbanUser({
            headers,
            body: { userId } as any,
          }),
        );

        return yield* getUser(userId, headers);
      }),
    deleteUser: (userId, headers) =>
      Effect.gen(function* () {
        yield* getBetterAuthUserOrFail(betterAuth.api, userId, headers);
        yield* userTryAsync('delete user role assignments', () =>
          usersRepository.deleteUserRoles(userId),
        );
        yield* userTryAsync('remove user from auth provider', () =>
          betterAuth.api.removeUser({
            headers,
            body: { userId } as any,
          }),
        );
      }),
    revokeSessions: (userId, headers) =>
      Effect.gen(function* () {
        yield* getBetterAuthUserOrFail(betterAuth.api, userId, headers);
        yield* userTryAsync('revoke user sessions', () =>
          betterAuth.api.revokeUserSessions({
            headers,
            body: { userId } as any,
          }),
        );
      }),
  };

  return service;
});
