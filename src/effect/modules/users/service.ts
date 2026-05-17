import { Effect } from 'effect';
import type {
  CreateUserDto,
  UserQueryDto,
  UserResponseDto,
  BanUserDto,
} from '@librestock/types/users';
import { makeTryAsync } from '../../platform/try-async';
import { BetterAuth, BetterAuthHeaders } from '../../platform/better-auth';
import { makeServiceTracer } from '../../platform/service-tracer';
import {
  requireRequestTenantId,
  type TenantNotResolved,
} from '../../platform/tenant-context';
import { RolesService } from '../roles/service';
import { UserNotFound, UsersInfrastructureError } from './users.errors';
import { UsersRepository } from './repository';

const tryAsync = makeTryAsync(
  (action, cause) =>
    new UsersInfrastructureError({
      action,
      cause,
      messageKey: 'users.infrastructureFailed',
    }),
);

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

interface BetterAuthCreateUserBody {
  readonly email: string;
  readonly name: string;
  readonly password: string;
  readonly role: 'admin' | 'user';
}

interface BetterAuthCreateUserResponse {
  readonly user: BetterAuthUser;
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
  '@librestock/effect/users/UsersService',
  {
    effect: Effect.gen(function* () {
      const betterAuth = yield* BetterAuth;
      const usersRepository = yield* UsersRepository;
      const rolesService = yield* RolesService;
      const trace = makeServiceTracer({
        serviceName: 'UsersService',
        module: 'users',
        layer: 'service',
        entityType: 'user',
      });
      const getBetterAuthUserOrFail = (
        api: typeof import('../../../auth').auth.api,
        id: string,
      ): Effect.Effect<
        BetterAuthUser,
        UserNotFound | UsersInfrastructureError,
        globalThis.Headers
      > =>
        Effect.gen(function* () {
          const headers = yield* BetterAuthHeaders;
          const result = yield* tryAsync('load user from auth provider', () =>
            api.listUsers({
              headers,
              query: {
                limit: 1,
                offset: 0,
                filterField: 'id',
                filterValue: id,
              },
            }),
          );

          const user = (result.users ?? [])[0] as BetterAuthUser | undefined;
          return user
            ? yield* Effect.succeed(user)
            : yield* Effect.fail(
                new UserNotFound({
                  id,
                  messageKey: 'users.notFound',
                }),
              );
        });

      const getUser = trace.traced(
        'getUser',
        (
          id: string,
        ): Effect.Effect<
          UserResponseDto,
          UserNotFound | UsersInfrastructureError | TenantNotResolved,
          globalThis.Headers
        > =>
          Effect.gen(function* () {
            const tenantId = yield* requireRequestTenantId;
            const hasTenantMembership =
              yield* usersRepository.hasTenantMembership(id, tenantId);

            yield* Effect.filterOrFail(
              Effect.succeed(hasTenantMembership),
              Boolean,
              () =>
                new UserNotFound({
                  id,
                  messageKey: 'users.notFound',
                }),
            );

            const user = yield* getBetterAuthUserOrFail(betterAuth.api, id);
            const roleEntities = yield* usersRepository.findUserRoles(
              id,
              tenantId,
            );

            return toUserResponse(
              user,
              roleEntities.map((roleEntity) => roleEntity.role.name),
            );
          }),
        (id) => ({ attributes: { userId: id } }),
      );

      const listUsers = trace.traced('listUsers', (query: UserQueryDto) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          const page = query.page ?? 1;
          const limit = query.limit ?? 20;
          const offset = (page - 1) * limit;

          const { users, total } = yield* usersRepository.listTenantUsers({
            tenantId,
            offset,
            limit,
            search: query.search,
            role: query.role,
          });
          const assignments = yield* usersRepository.findRoleAssignments(
            users.map((user) => user.id),
            tenantId,
          );

          const rolesByUserId = new Map<string, string[]>();
          for (const assignment of assignments) {
            const roleNames = rolesByUserId.get(assignment.user_id) ?? [];
            roleNames.push(assignment.role.name);
            rolesByUserId.set(assignment.user_id, roleNames);
          }

          return {
            data: users.map((user) =>
              toUserResponse(user, rolesByUserId.get(user.id) ?? []),
            ),
            total,
            page,
            limit,
            total_pages: Math.ceil(total / limit),
          };
        }),
      );

      const createUser = trace.traced('createUser', (dto: CreateUserDto) =>
        Effect.gen(function* () {
          const hasAdminRole = yield* usersRepository.hasAdminRole(dto.roles);
          const result = yield* tryAsync(
            'create user in auth provider',
            () =>
              betterAuth.api.createUser({
                body: {
                  email: dto.email,
                  name: dto.name,
                  password: dto.password,
                  role: hasAdminRole ? 'admin' : 'user',
                } satisfies BetterAuthCreateUserBody,
              }) as Promise<BetterAuthCreateUserResponse>,
          );

          yield* usersRepository.replaceUserRoles(result.user.id, dto.roles);
          yield* rolesService.clearCacheForUser(result.user.id);

          const roleEntities = yield* usersRepository.findUserRoles(
            result.user.id,
          );

          return toUserResponse(
            result.user,
            roleEntities.map((roleEntity) => roleEntity.role.name),
          );
        }),
      );

      const updateRoles = trace.traced(
        'updateRoles',
        (userId: string, roleIds: string[]) =>
          Effect.gen(function* () {
            const tenantId = yield* requireRequestTenantId;
            const hasTenantMembership =
              yield* usersRepository.hasTenantMembership(userId, tenantId);

            yield* Effect.filterOrFail(
              Effect.succeed(hasTenantMembership),
              Boolean,
              () =>
                new UserNotFound({
                  id: userId,
                  messageKey: 'users.notFound',
                }),
            );

            yield* getBetterAuthUserOrFail(betterAuth.api, userId);
            yield* usersRepository.replaceUserRoles(userId, roleIds, tenantId);

            const hasAdminRole =
              yield* usersRepository.hasAdminRoleForUser(userId);

            yield* usersRepository.syncBetterAuthRole(
              userId,
              hasAdminRole ? 'admin' : 'user',
            );

            yield* rolesService.clearCacheForUser(userId);

            return yield* getUser(userId);
          }),
        (userId) => ({ attributes: { userId } }),
      );

      const banUser = trace.traced(
        'banUser',
        (userId: string, dto: BanUserDto) =>
          Effect.gen(function* () {
            const headers = yield* BetterAuthHeaders;
            yield* getBetterAuthUserOrFail(betterAuth.api, userId);

            const body: BetterAuthBanUserBody = { userId };
            if (dto.reason) {
              body.banReason = dto.reason;
            }
            if (dto.expiresAt) {
              body.banExpiresIn = Math.max(
                0,
                Math.floor(
                  (new Date(dto.expiresAt).getTime() - Date.now()) / 1000,
                ),
              );
            }

            yield* tryAsync('ban user in auth provider', () =>
              betterAuth.api.banUser({
                headers,
                body,
              }),
            );

            return yield* getUser(userId);
          }),
        (userId) => ({ attributes: { userId } }),
      );

      const unbanUser = trace.traced(
        'unbanUser',
        (userId: string) =>
          Effect.gen(function* () {
            const headers = yield* BetterAuthHeaders;
            yield* getBetterAuthUserOrFail(betterAuth.api, userId);
            yield* tryAsync('unban user in auth provider', () =>
              betterAuth.api.unbanUser({
                headers,
                body: { userId } satisfies BetterAuthUserActionBody,
              }),
            );

            return yield* getUser(userId);
          }),
        (userId) => ({ attributes: { userId } }),
      );

      const deleteUser = trace.traced(
        'deleteUser',
        (userId: string) =>
          Effect.gen(function* () {
            const tenantId = yield* requireRequestTenantId;
            const headers = yield* BetterAuthHeaders;
            yield* getBetterAuthUserOrFail(betterAuth.api, userId);
            yield* usersRepository.deleteUserRoles(userId, tenantId);
            yield* usersRepository.deleteTenantMembership(userId, tenantId);
            const hasRemainingTenantMemberships =
              yield* usersRepository.hasTenantMemberships(userId);

            if (!hasRemainingTenantMemberships) {
              yield* tryAsync('remove user from auth provider', () =>
                betterAuth.api.removeUser({
                  headers,
                  body: { userId } satisfies BetterAuthUserActionBody,
                }),
              );
            }
          }),
        (userId) => ({ attributes: { userId } }),
      );

      const revokeSessions = trace.traced(
        'revokeSessions',
        (userId: string) =>
          Effect.gen(function* () {
            const headers = yield* BetterAuthHeaders;
            yield* getBetterAuthUserOrFail(betterAuth.api, userId);
            yield* tryAsync('revoke user sessions', () =>
              betterAuth.api.revokeUserSessions({
                headers,
                body: { userId } satisfies BetterAuthUserActionBody,
              }),
            );
          }),
        (userId) => ({ attributes: { userId } }),
      );

      return {
        listUsers,
        getUser,
        createUser,
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
