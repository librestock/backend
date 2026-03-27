import { Effect } from 'effect';
import type { UserQueryDto, UserResponseDto, BanUserDto } from '@librestock/types/users';
import { BetterAuth } from '../../platform/better-auth';
import { RolesService } from '../roles/service';
import { UserNotFound, UsersInfrastructureError } from './users.errors';
import { UsersRepository } from './repository';

interface BetterAuthUser {
  readonly id: string;
  readonly name?: string | null;
  readonly email?: string | null;
  readonly image?: string | null;
  readonly banned?: boolean | null;
  readonly banReason?: string | null;
  readonly banExpires?: string | Date | null;
  readonly createdAt: string | Date;
}

interface BetterAuthBanUserBody {
  readonly userId: string;
  banReason?: string;
  banExpiresIn?: number;
}

interface BetterAuthUserActionBody {
  readonly userId: string;
}

const toUserResponse = (
  user: BetterAuthUser,
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

export class UsersService extends Effect.Service<UsersService>()(
  '@librestock/effect/UsersService',
  {
    effect: Effect.gen(function* () {
      const betterAuth = yield* BetterAuth;
      const usersRepository = yield* UsersRepository;
      const rolesService = yield* RolesService;

      const userTryAsync = <A>(action: string, run: () => Promise<A>) =>
        Effect.tryPromise({
          try: run,
          catch: (cause) =>
            new UsersInfrastructureError({
              action,
              cause,
              messageKey: 'users.infrastructureFailed',
            }),
        });

      const getBetterAuthUserOrFail = (
        api: typeof import('../../../auth').auth.api,
        id: string,
        headers: Headers,
      ): Effect.Effect<BetterAuthUser, UserNotFound | UsersInfrastructureError> =>
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
            const user = (result.users ?? [])[0] as BetterAuthUser | undefined;
            return user
              ? Effect.succeed(user)
              : Effect.fail(
                  new UserNotFound({
                    id,
                    messageKey: 'users.notFound',
                  }),
                );
          },
        );

      const getUser = (
        id: string,
        headers: Headers,
      ): Effect.Effect<UserResponseDto, UserNotFound | UsersInfrastructureError> =>
        Effect.gen(function* () {
          const user = yield* getBetterAuthUserOrFail(betterAuth.api, id, headers);
          const roleEntities = yield* usersRepository.findUserRoles(id);

          return toUserResponse(
            user,
            roleEntities.map((roleEntity) => roleEntity.role.name),
          );
        }).pipe(Effect.withSpan('UsersService.getUser', { attributes: { id } }));

      const listUsers = (query: UserQueryDto, headers: Headers) =>
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

          const users = (result.users ?? []) as BetterAuthUser[];
          const total = result.total ?? users.length;
          const assignments = yield* usersRepository.findRoleAssignments(users.map((user) => user.id));

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
        }).pipe(Effect.withSpan('UsersService.listUsers'));

      const updateRoles = (userId: string, roleIds: string[], headers: Headers) =>
        Effect.gen(function* () {
          yield* getBetterAuthUserOrFail(betterAuth.api, userId, headers);
          yield* usersRepository.replaceUserRoles(userId, roleIds);

          const hasAdminRole = yield* usersRepository.hasAdminRole(roleIds);

          yield* usersRepository.syncBetterAuthRole(
            userId,
            hasAdminRole ? 'admin' : 'user',
          );

          yield* rolesService.clearCacheForUser(userId);

          return yield* getUser(userId, headers);
        }).pipe(Effect.withSpan('UsersService.updateRoles', { attributes: { userId } }));

      const banUser = (userId: string, dto: BanUserDto, headers: Headers) =>
        Effect.gen(function* () {
          yield* getBetterAuthUserOrFail(betterAuth.api, userId, headers);

          const body: BetterAuthBanUserBody = { userId };
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
              body,
            }),
          );

          return yield* getUser(userId, headers);
        }).pipe(Effect.withSpan('UsersService.banUser', { attributes: { userId } }));

      const unbanUser = (userId: string, headers: Headers) =>
        Effect.gen(function* () {
          yield* getBetterAuthUserOrFail(betterAuth.api, userId, headers);
          yield* userTryAsync('unban user in auth provider', () =>
            betterAuth.api.unbanUser({
              headers,
              body: { userId } satisfies BetterAuthUserActionBody,
            }),
          );

          return yield* getUser(userId, headers);
        }).pipe(Effect.withSpan('UsersService.unbanUser', { attributes: { userId } }));

      const deleteUser = (userId: string, headers: Headers) =>
        Effect.gen(function* () {
          yield* getBetterAuthUserOrFail(betterAuth.api, userId, headers);
          yield* usersRepository.deleteUserRoles(userId);
          yield* userTryAsync('remove user from auth provider', () =>
            betterAuth.api.removeUser({
              headers,
              body: { userId } satisfies BetterAuthUserActionBody,
            }),
          );
        }).pipe(Effect.withSpan('UsersService.deleteUser', { attributes: { userId } }));

      const revokeSessions = (userId: string, headers: Headers) =>
        Effect.gen(function* () {
          yield* getBetterAuthUserOrFail(betterAuth.api, userId, headers);
          yield* userTryAsync('revoke user sessions', () =>
            betterAuth.api.revokeUserSessions({
              headers,
              body: { userId } satisfies BetterAuthUserActionBody,
            }),
          );
        }).pipe(Effect.withSpan('UsersService.revokeSessions', { attributes: { userId } }));

      return {
        listUsers,
        getUser,
        updateRoles,
        banUser,
        unbanUser,
        deleteUser,
        revokeSessions,
      };
    }),
    dependencies: [UsersRepository.Default, RolesService.Default],
  },
) {}
