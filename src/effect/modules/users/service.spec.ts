jest.mock('../../platform/better-auth', () => {
  const { Context, Layer } = require('effect');

  return {
    BetterAuth: Context.GenericTag('@librestock/test/BetterAuth'),
    betterAuthLayer: Layer.empty,
  };
});

import { Effect, Layer } from 'effect';
import { BetterAuth } from '../../platform/better-auth';
import { makeUsersService } from './service';
import { UsersRepository } from './repository';
import { RolesService } from '../roles/service';

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
      makeUsersService.pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.succeed(BetterAuth, betterAuth),
            Layer.succeed(UsersRepository, usersRepository),
            Layer.succeed(RolesService, rolesService),
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
        listUsers: jest.fn().mockResolvedValue({
          users: [betterAuthUser],
          total: 1,
        }),
      },
    };
    const usersRepository = {
      findRoleAssignments: jest.fn().mockResolvedValue([
        {
          user_id: 'user-1',
          role: { name: 'Admin' },
        },
      ]),
      findUserRoles: jest.fn(),
      replaceUserRoles: jest.fn(),
      hasAdminRole: jest.fn(),
      syncBetterAuthRole: jest.fn(),
      deleteUserRoles: jest.fn(),
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
        listUsers: jest.fn().mockResolvedValue({
          users: [betterAuthUser],
        }),
      },
    };
    const usersRepository = {
      findRoleAssignments: jest.fn(),
      findUserRoles: jest.fn().mockResolvedValue([
        {
          role: { name: 'Admin' },
        },
      ]),
      replaceUserRoles: jest.fn(),
      hasAdminRole: jest.fn(),
      syncBetterAuthRole: jest.fn(),
      deleteUserRoles: jest.fn(),
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
          .mockResolvedValueOnce({ users: [betterAuthUser] })
          .mockResolvedValueOnce({ users: [betterAuthUser] }),
      },
    };
    const usersRepository = {
      findRoleAssignments: jest.fn(),
      findUserRoles: jest.fn().mockResolvedValue([
        {
          role: { name: 'Admin' },
        },
      ]),
      replaceUserRoles: jest.fn().mockResolvedValue(undefined),
      hasAdminRole: jest.fn().mockResolvedValue(true),
      syncBetterAuthRole: jest.fn().mockResolvedValue(undefined),
      deleteUserRoles: jest.fn(),
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
          .mockResolvedValue({ users: [betterAuthUser] }),
        banUser: jest.fn().mockResolvedValue(undefined),
        unbanUser: jest.fn().mockResolvedValue(undefined),
      },
    };
    const usersRepository = {
      findRoleAssignments: jest.fn(),
      findUserRoles: jest.fn().mockResolvedValue([]),
      replaceUserRoles: jest.fn(),
      hasAdminRole: jest.fn(),
      syncBetterAuthRole: jest.fn(),
      deleteUserRoles: jest.fn(),
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
        listUsers: jest.fn().mockResolvedValue({ users: [betterAuthUser] }),
        revokeUserSessions: jest.fn().mockResolvedValue(undefined),
      },
    };
    const usersRepository = {
      findRoleAssignments: jest.fn(),
      findUserRoles: jest.fn().mockResolvedValue([]),
      replaceUserRoles: jest.fn(),
      hasAdminRole: jest.fn(),
      syncBetterAuthRole: jest.fn(),
      deleteUserRoles: jest.fn(),
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
