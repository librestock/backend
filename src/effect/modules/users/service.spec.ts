import { Effect, Layer } from 'effect';
import { BetterAuth } from '../../platform/better-auth';
import { RolesService } from '../roles/service';
import { UsersService } from './service';
import { UsersRepository } from './repository';

jest.mock('../../platform/better-auth', () => {
  const { Context, Layer } =
    jest.requireActual<typeof import('effect')>('effect');

  return {
    BetterAuth: Context.GenericTag('@librestock/test/BetterAuth'),
    betterAuthLayer: Layer.empty,
  };
});

describe('Effect UsersService', () => {
  const headers = new Headers({
    authorization: 'Bearer test-token',
  });

  const makeService = async ({
    betterAuth,
    usersRepository,
    rolesService,
  }: {
    betterAuth: any;
    usersRepository: any;
    rolesService: any;
  }) =>
    Effect.runPromise(
      UsersService.pipe(
        Effect.provide(
          UsersService.DefaultWithoutDependencies.pipe(
            Layer.provide(
              Layer.mergeAll(
                Layer.succeed(BetterAuth, betterAuth),
                Layer.succeed(UsersRepository, usersRepository),
                Layer.succeed(RolesService, rolesService),
              ),
            ),
          ),
        ),
      ),
    );

  const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

  const betterAuthUser = {
    id: 'user-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    image: null,
    banned: false,
    banReason: null,
    banExpires: null,
    createdAt: '2026-03-01T00:00:00.000Z',
  };

  it('lists users and merges role names', async () => {
    const betterAuth = {
      api: {
        listUsers: jest.fn().mockReturnValue(Promise.resolve({
          users: [betterAuthUser],
          total: 1,
        })),
      },
    };
    const usersRepository = {
      findRoleAssignments: jest.fn().mockReturnValue(Effect.succeed([
        {
          user_id: 'user-1',
          role: { name: 'Admin' },
        },
      ])),
      findUserRoles: jest.fn().mockReturnValue(Effect.succeed([])),
      replaceUserRoles: jest.fn().mockReturnValue(Effect.succeed(undefined)),
      hasAdminRole: jest.fn().mockReturnValue(Effect.succeed(false)),
      syncBetterAuthRole: jest.fn().mockReturnValue(Effect.succeed(undefined)),
      deleteUserRoles: jest.fn().mockReturnValue(Effect.succeed(undefined)),
    };
    const rolesService = {
      clearCacheForUser: jest.fn().mockReturnValue(Effect.void),
    };
    const service = await makeService({
      betterAuth,
      usersRepository,
      rolesService,
    });

    const result = await run(service.listUsers({ page: 1, limit: 20 }, headers));

    expect(result.data[0]!.roles).toEqual(['Admin']);
    expect(betterAuth.api.listUsers).toHaveBeenCalled();
  });

  it('gets a single user with roles', async () => {
    const betterAuth = {
      api: {
        listUsers: jest.fn().mockReturnValue(Promise.resolve({
          users: [betterAuthUser],
        })),
      },
    };
    const usersRepository = {
      findRoleAssignments: jest.fn().mockReturnValue(Effect.succeed([])),
      findUserRoles: jest.fn().mockReturnValue(Effect.succeed([
        {
          role: { name: 'Admin' },
        },
      ])),
      replaceUserRoles: jest.fn().mockReturnValue(Effect.succeed(undefined)),
      hasAdminRole: jest.fn().mockReturnValue(Effect.succeed(false)),
      syncBetterAuthRole: jest.fn().mockReturnValue(Effect.succeed(undefined)),
      deleteUserRoles: jest.fn().mockReturnValue(Effect.succeed(undefined)),
    };
    const rolesService = {
      clearCacheForUser: jest.fn().mockReturnValue(Effect.void),
    };
    const service = await makeService({
      betterAuth,
      usersRepository,
      rolesService,
    });

    const result = await run(service.getUser('user-1', headers));

    expect(result.id).toBe('user-1');
    expect(result.roles).toEqual(['Admin']);
  });

  it('updates roles, syncs auth role column, and clears cached permissions', async () => {
    const betterAuth = {
      api: {
        listUsers: jest
          .fn()
          .mockReturnValueOnce(Promise.resolve({ users: [betterAuthUser] }))
          .mockReturnValueOnce(Promise.resolve({ users: [betterAuthUser] })),
      },
    };
    const usersRepository = {
      findRoleAssignments: jest.fn().mockReturnValue(Effect.succeed([])),
      findUserRoles: jest.fn().mockReturnValue(Effect.succeed([
        {
          role: { name: 'Admin' },
        },
      ])),
      replaceUserRoles: jest.fn().mockReturnValue(Effect.succeed(undefined)),
      hasAdminRole: jest.fn().mockReturnValue(Effect.succeed(true)),
      syncBetterAuthRole: jest.fn().mockReturnValue(Effect.succeed(undefined)),
      deleteUserRoles: jest.fn().mockReturnValue(Effect.succeed(undefined)),
    };
    const rolesService = {
      clearCacheForUser: jest.fn().mockReturnValue(Effect.void),
    };
    const service = await makeService({
      betterAuth,
      usersRepository,
      rolesService,
    });

    await run(service.updateRoles('user-1', ['role-1'], headers));

    expect(usersRepository.replaceUserRoles).toHaveBeenCalledWith('user-1', [
      'role-1',
    ]);
    expect(usersRepository.syncBetterAuthRole).toHaveBeenCalledWith(
      'user-1',
      'admin',
    );
    expect(rolesService.clearCacheForUser).toHaveBeenCalledWith('user-1');
  });

  it('bans and unbans a user through Better Auth', async () => {
    const betterAuth = {
      api: {
        listUsers: jest
          .fn()
          .mockReturnValue(Promise.resolve({ users: [betterAuthUser] })),
        banUser: jest.fn().mockReturnValue(Promise.resolve(undefined)),
        unbanUser: jest.fn().mockReturnValue(Promise.resolve(undefined)),
      },
    };
    const usersRepository = {
      findRoleAssignments: jest.fn().mockReturnValue(Effect.succeed([])),
      findUserRoles: jest.fn().mockReturnValue(Effect.succeed([])),
      replaceUserRoles: jest.fn().mockReturnValue(Effect.succeed(undefined)),
      hasAdminRole: jest.fn().mockReturnValue(Effect.succeed(false)),
      syncBetterAuthRole: jest.fn().mockReturnValue(Effect.succeed(undefined)),
      deleteUserRoles: jest.fn().mockReturnValue(Effect.succeed(undefined)),
    };
    const rolesService = {
      clearCacheForUser: jest.fn().mockReturnValue(Effect.void),
    };
    const service = await makeService({
      betterAuth,
      usersRepository,
      rolesService,
    });

    await run(
      service.banUser(
        'user-1',
        {
          reason: 'abuse',
          expiresAt: '2026-04-01T00:00:00.000Z',
        },
        headers,
      ),
    );
    await run(service.unbanUser('user-1', headers));

    expect(betterAuth.api.banUser).toHaveBeenCalled();
    expect(betterAuth.api.unbanUser).toHaveBeenCalledWith({
      headers,
      body: { userId: 'user-1' },
    });
  });

  it('revokes user sessions', async () => {
    const betterAuth = {
      api: {
        listUsers: jest.fn().mockReturnValue(Promise.resolve({ users: [betterAuthUser] })),
        revokeUserSessions: jest.fn().mockReturnValue(Promise.resolve(undefined)),
      },
    };
    const usersRepository = {
      findRoleAssignments: jest.fn().mockReturnValue(Effect.succeed([])),
      findUserRoles: jest.fn().mockReturnValue(Effect.succeed([])),
      replaceUserRoles: jest.fn().mockReturnValue(Effect.succeed(undefined)),
      hasAdminRole: jest.fn().mockReturnValue(Effect.succeed(false)),
      syncBetterAuthRole: jest.fn().mockReturnValue(Effect.succeed(undefined)),
      deleteUserRoles: jest.fn().mockReturnValue(Effect.succeed(undefined)),
    };
    const rolesService = {
      clearCacheForUser: jest.fn().mockReturnValue(Effect.void),
    };
    const service = await makeService({
      betterAuth,
      usersRepository,
      rolesService,
    });

    await run(service.revokeSessions('user-1', headers));

    expect(betterAuth.api.revokeUserSessions).toHaveBeenCalledWith({
      headers,
      body: { userId: 'user-1' },
    });
  });
});
