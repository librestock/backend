import { Effect, Layer } from 'effect';
import { BetterAuth, BetterAuthHeaders } from '../../platform/better-auth';
import { CurrentRequestContext } from '../../platform/request-context';
import { RolesService } from '../roles/service';
import { UsersService } from './service';
import { UsersRepository } from './repository';

vi.mock('../../platform/better-auth', async () => {
  const { Context, Layer } =
    await vi.importActual<typeof import('effect')>('effect');

  return {
    BetterAuth: Context.GenericTag('@librestock/test/BetterAuth'),
    BetterAuthHeaders: Context.GenericTag('@librestock/test/BetterAuthHeaders'),
    betterAuthLayer: Layer.empty,
  };
});

describe('Effect UsersService', () => {
  const headers = new Headers({
    authorization: 'Bearer test-token',
  });

  const requestContext = {
    requestId: '00000000-0000-4000-8000-000000000099',
    path: '/api/v1/users',
    method: 'GET' as const,
    ip: null,
    locale: 'en' as const,
    tenantId: '00000000-0000-4000-8000-000000000001',
  };

  const makeService = async ({
    betterAuth,
    usersRepository,
    rolesService,
  }: {
    betterAuth: unknown;
    usersRepository: unknown;
    rolesService: unknown;
  }) =>
    Effect.runPromise(
      UsersService.pipe(
        Effect.provide(
          UsersService.DefaultWithoutDependencies.pipe(
            Layer.provide(
              Layer.mergeAll(
                Layer.succeed(
                  BetterAuth,
                  betterAuth as typeof BetterAuth.Service,
                ),
                Layer.succeed(
                  UsersRepository,
                  usersRepository as typeof UsersRepository.Service,
                ),
                Layer.succeed(
                  RolesService,
                  rolesService as typeof RolesService.Service,
                ),
              ),
            ),
          ),
        ),
      ),
    );

  const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
  const fail = <A, E>(effect: Effect.Effect<A, E>) =>
    Effect.runPromise(Effect.flip(effect));

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

  it('creates a tenant member, assigns roles, and uses the admin auth role when needed', async () => {
    const createdUser = {
      ...betterAuthUser,
      id: 'user-2',
      name: 'New Admin',
      email: 'new-admin@example.com',
    };
    const betterAuth = {
      api: {
        createUser: vi.fn().mockResolvedValue({ user: createdUser }),
        removeUser: vi.fn().mockResolvedValue(undefined),
      },
    };
    const usersRepository = {
      validateRoleIds: vi.fn().mockReturnValue(Effect.void),
      findRoleAssignments: vi.fn().mockReturnValue(Effect.succeed([])),
      findUserRoles: vi.fn().mockReturnValue(
        Effect.succeed([
          {
            role: { name: 'Admin' },
          },
        ]),
      ),
      createTenantMembership: vi.fn().mockReturnValue(Effect.void),
      replaceUserRoles: vi.fn().mockReturnValue(Effect.void),
      hasAdminRole: vi.fn().mockReturnValue(Effect.succeed(true)),
      syncBetterAuthRole: vi.fn().mockReturnValue(Effect.void),
      deleteUserRoles: vi.fn().mockReturnValue(Effect.void),
      deleteTenantMembership: vi.fn().mockReturnValue(Effect.void),
    };
    const rolesService = {
      clearCacheForUser: vi.fn().mockReturnValue(Effect.void),
    };
    const service = await makeService({
      betterAuth,
      usersRepository,
      rolesService,
    });

    const result = await run(
      service
        .createUser({
          name: 'New Admin',
          email: 'new-admin@example.com',
          password: 'password123',
          roles: ['role-1'],
        })
        .pipe(
          Effect.provideService(BetterAuthHeaders, headers),
          Effect.provideService(CurrentRequestContext, requestContext),
        ),
    );

    expect(usersRepository.validateRoleIds).toHaveBeenCalledWith(
      ['role-1'],
      '00000000-0000-4000-8000-000000000001',
    );
    expect(betterAuth.api.createUser).toHaveBeenCalledWith({
      headers,
      body: {
        email: 'new-admin@example.com',
        name: 'New Admin',
        password: 'password123',
        role: 'admin',
      },
    });
    expect(usersRepository.createTenantMembership).toHaveBeenCalledWith(
      'user-2',
      '00000000-0000-4000-8000-000000000001',
    );
    expect(usersRepository.replaceUserRoles).toHaveBeenCalledWith(
      'user-2',
      ['role-1'],
      '00000000-0000-4000-8000-000000000001',
    );
    expect(usersRepository.findUserRoles).toHaveBeenCalledWith(
      'user-2',
      '00000000-0000-4000-8000-000000000001',
    );
    expect(rolesService.clearCacheForUser).toHaveBeenCalledWith('user-2');
    expect(betterAuth.api.removeUser).not.toHaveBeenCalled();
    expect(result.roles).toEqual(['Admin']);
  });

  it('removes the auth user when local tenant setup fails after create', async () => {
    const createdUser = {
      ...betterAuthUser,
      id: 'user-2',
      name: 'New User',
      email: 'new-user@example.com',
    };
    const betterAuth = {
      api: {
        createUser: vi.fn().mockResolvedValue({ user: createdUser }),
        removeUser: vi.fn().mockResolvedValue(undefined),
      },
    };
    const usersRepository = {
      validateRoleIds: vi.fn().mockReturnValue(Effect.void),
      findRoleAssignments: vi.fn().mockReturnValue(Effect.succeed([])),
      findUserRoles: vi.fn().mockReturnValue(Effect.succeed([])),
      createTenantMembership: vi
        .fn()
        .mockReturnValue(Effect.fail(new Error('membership insert failed'))),
      replaceUserRoles: vi.fn().mockReturnValue(Effect.void),
      hasAdminRole: vi.fn().mockReturnValue(Effect.succeed(false)),
      syncBetterAuthRole: vi.fn().mockReturnValue(Effect.void),
      deleteUserRoles: vi.fn().mockReturnValue(Effect.void),
      deleteTenantMembership: vi.fn().mockReturnValue(Effect.void),
    };
    const rolesService = {
      clearCacheForUser: vi.fn().mockReturnValue(Effect.void),
    };
    const service = await makeService({
      betterAuth,
      usersRepository,
      rolesService,
    });

    await expect(
      run(
        service
          .createUser({
            name: 'New User',
            email: 'new-user@example.com',
            password: 'password123',
            roles: ['role-1'],
          })
          .pipe(
            Effect.provideService(BetterAuthHeaders, headers),
            Effect.provideService(CurrentRequestContext, requestContext),
          ),
      ),
    ).rejects.toThrow('membership insert failed');

    expect(usersRepository.deleteUserRoles).toHaveBeenCalledWith(
      'user-2',
      '00000000-0000-4000-8000-000000000001',
    );
    expect(usersRepository.deleteTenantMembership).toHaveBeenCalledWith(
      'user-2',
      '00000000-0000-4000-8000-000000000001',
    );
    expect(betterAuth.api.removeUser).toHaveBeenCalledWith({
      headers,
      body: { userId: 'user-2' },
    });
  });

  it('paginates tenant users before merging roles', async () => {
    const betterAuth = {
      api: {
        listUsers: vi.fn(),
      },
    };
    const usersRepository = {
      listTenantUsers: vi.fn().mockReturnValue(
        Effect.succeed({
          users: [betterAuthUser],
          total: 50,
        }),
      ),
      findRoleAssignments: vi.fn().mockReturnValue(
        Effect.succeed([
          {
            user_id: 'user-1',
            role: { name: 'Admin' },
          },
        ]),
      ),
      findUserRoles: vi.fn().mockReturnValue(Effect.succeed([])),
      replaceUserRoles: vi.fn().mockReturnValue(Effect.void),
      hasAdminRole: vi.fn().mockReturnValue(Effect.succeed(false)),
      hasAdminRoleForUser: vi.fn().mockReturnValue(Effect.succeed(false)),
      syncBetterAuthRole: vi.fn().mockReturnValue(Effect.void),
      deleteUserRoles: vi.fn().mockReturnValue(Effect.void),
    };
    const rolesService = {
      clearCacheForUser: vi.fn().mockReturnValue(Effect.void),
    };
    const service = await makeService({
      betterAuth,
      usersRepository,
      rolesService,
    });

    const result = await run(
      service
        .listUsers({ page: 2, limit: 1 })
        .pipe(
          Effect.provideService(BetterAuthHeaders, headers),
          Effect.provideService(CurrentRequestContext, requestContext),
        ),
    );

    expect(result.total).toBe(50);
    expect(result.total_pages).toBe(50);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.roles).toEqual(['Admin']);
    expect(usersRepository.listTenantUsers).toHaveBeenCalledWith({
      tenantId: '00000000-0000-4000-8000-000000000001',
      offset: 1,
      limit: 1,
      search: undefined,
      role: undefined,
    });
    expect(betterAuth.api.listUsers).not.toHaveBeenCalled();
  });

  it('gets a single user with roles', async () => {
    const betterAuth = {
      api: {
        listUsers: vi.fn().mockReturnValue(
          Promise.resolve({
            users: [betterAuthUser],
          }),
        ),
      },
    };
    const usersRepository = {
      findRoleAssignments: vi.fn().mockReturnValue(Effect.succeed([])),
      findUserRoles: vi.fn().mockReturnValue(
        Effect.succeed([
          {
            role: { name: 'Admin' },
          },
        ]),
      ),
      replaceUserRoles: vi.fn().mockReturnValue(Effect.void),
      hasAdminRole: vi.fn().mockReturnValue(Effect.succeed(false)),
      hasAdminRoleForUser: vi.fn().mockReturnValue(Effect.succeed(false)),
      hasTenantMembership: vi.fn().mockReturnValue(Effect.succeed(true)),
      syncBetterAuthRole: vi.fn().mockReturnValue(Effect.void),
      deleteUserRoles: vi.fn().mockReturnValue(Effect.void),
    };
    const rolesService = {
      clearCacheForUser: vi.fn().mockReturnValue(Effect.void),
    };
    const service = await makeService({
      betterAuth,
      usersRepository,
      rolesService,
    });

    const result = await run(
      service
        .getUser('user-1')
        .pipe(
          Effect.provideService(BetterAuthHeaders, headers),
          Effect.provideService(CurrentRequestContext, requestContext),
        ),
    );

    expect(result.id).toBe('user-1');
    expect(result.roles).toEqual(['Admin']);
  });

  it('returns UserNotFound without loading Better Auth when getUser targets a non-member', async () => {
    const betterAuth = {
      api: {
        listUsers: vi.fn(),
      },
    };
    const usersRepository = {
      findRoleAssignments: vi.fn().mockReturnValue(Effect.succeed([])),
      findUserRoles: vi.fn().mockReturnValue(Effect.succeed([])),
      replaceUserRoles: vi.fn().mockReturnValue(Effect.void),
      hasAdminRole: vi.fn().mockReturnValue(Effect.succeed(false)),
      hasAdminRoleForUser: vi.fn().mockReturnValue(Effect.succeed(false)),
      hasTenantMembership: vi.fn().mockReturnValue(Effect.succeed(false)),
      syncBetterAuthRole: vi.fn().mockReturnValue(Effect.void),
      deleteUserRoles: vi.fn().mockReturnValue(Effect.void),
    };
    const rolesService = {
      clearCacheForUser: vi.fn().mockReturnValue(Effect.void),
    };
    const service = await makeService({
      betterAuth,
      usersRepository,
      rolesService,
    });

    const error = await fail(
      service
        .getUser('user-1')
        .pipe(
          Effect.provideService(BetterAuthHeaders, headers),
          Effect.provideService(CurrentRequestContext, requestContext),
        ),
    );

    expect(error._tag).toBe('UserNotFound');
    expect(usersRepository.hasTenantMembership).toHaveBeenCalledWith(
      'user-1',
      '00000000-0000-4000-8000-000000000001',
    );
    expect(betterAuth.api.listUsers).not.toHaveBeenCalled();
  });

  it('updates roles, syncs aggregate auth role column, and clears cached permissions', async () => {
    const betterAuth = {
      api: {
        listUsers: vi
          .fn()
          .mockReturnValueOnce(Promise.resolve({ users: [betterAuthUser] }))
          .mockReturnValueOnce(Promise.resolve({ users: [betterAuthUser] })),
      },
    };
    const usersRepository = {
      findRoleAssignments: vi.fn().mockReturnValue(Effect.succeed([])),
      findUserRoles: vi.fn().mockReturnValue(
        Effect.succeed([
          {
            role: { name: 'Admin' },
          },
        ]),
      ),
      replaceUserRoles: vi.fn().mockReturnValue(Effect.void),
      hasAdminRole: vi.fn().mockReturnValue(Effect.succeed(true)),
      hasAdminRoleForUser: vi.fn().mockReturnValue(Effect.succeed(true)),
      hasTenantMembership: vi.fn().mockReturnValue(Effect.succeed(true)),
      syncBetterAuthRole: vi.fn().mockReturnValue(Effect.void),
      deleteUserRoles: vi.fn().mockReturnValue(Effect.void),
    };
    const rolesService = {
      clearCacheForUser: vi.fn().mockReturnValue(Effect.void),
    };
    const service = await makeService({
      betterAuth,
      usersRepository,
      rolesService,
    });

    await run(
      service
        .updateRoles('user-1', ['role-1'])
        .pipe(
          Effect.provideService(BetterAuthHeaders, headers),
          Effect.provideService(CurrentRequestContext, requestContext),
        ),
    );

    expect(usersRepository.replaceUserRoles).toHaveBeenCalledWith(
      'user-1',
      ['role-1'],
      '00000000-0000-4000-8000-000000000001',
    );
    expect(usersRepository.hasAdminRoleForUser).toHaveBeenCalledWith('user-1');
    expect(
      usersRepository.hasAdminRoleForUser.mock.invocationCallOrder[0],
    ).toBeGreaterThan(
      usersRepository.replaceUserRoles.mock.invocationCallOrder[0] ?? 0,
    );
    expect(usersRepository.syncBetterAuthRole).toHaveBeenCalledWith(
      'user-1',
      'admin',
    );
    expect(rolesService.clearCacheForUser).toHaveBeenCalledWith('user-1');
  });

  it('returns UserNotFound without mutating roles when updateRoles targets a non-member', async () => {
    const betterAuth = {
      api: {
        listUsers: vi.fn(),
      },
    };
    const usersRepository = {
      findRoleAssignments: vi.fn().mockReturnValue(Effect.succeed([])),
      findUserRoles: vi.fn().mockReturnValue(Effect.succeed([])),
      replaceUserRoles: vi.fn().mockReturnValue(Effect.void),
      hasAdminRole: vi.fn().mockReturnValue(Effect.succeed(false)),
      hasAdminRoleForUser: vi.fn().mockReturnValue(Effect.succeed(false)),
      hasTenantMembership: vi.fn().mockReturnValue(Effect.succeed(false)),
      syncBetterAuthRole: vi.fn().mockReturnValue(Effect.void),
      deleteUserRoles: vi.fn().mockReturnValue(Effect.void),
    };
    const rolesService = {
      clearCacheForUser: vi.fn().mockReturnValue(Effect.void),
    };
    const service = await makeService({
      betterAuth,
      usersRepository,
      rolesService,
    });

    const error = await fail(
      service
        .updateRoles('user-1', ['role-1'])
        .pipe(
          Effect.provideService(BetterAuthHeaders, headers),
          Effect.provideService(CurrentRequestContext, requestContext),
        ),
    );

    expect(error._tag).toBe('UserNotFound');
    expect(usersRepository.hasTenantMembership).toHaveBeenCalledWith(
      'user-1',
      '00000000-0000-4000-8000-000000000001',
    );
    expect(betterAuth.api.listUsers).not.toHaveBeenCalled();
    expect(usersRepository.replaceUserRoles).not.toHaveBeenCalled();
    expect(usersRepository.syncBetterAuthRole).not.toHaveBeenCalled();
  });

  it('bans and unbans a user through Better Auth', async () => {
    const betterAuth = {
      api: {
        listUsers: vi
          .fn()
          .mockReturnValue(Promise.resolve({ users: [betterAuthUser] })),
        banUser: vi.fn().mockReturnValue(Promise.resolve(undefined)),
        unbanUser: vi.fn().mockReturnValue(Promise.resolve(undefined)),
      },
    };
    const usersRepository = {
      findRoleAssignments: vi.fn().mockReturnValue(Effect.succeed([])),
      findUserRoles: vi.fn().mockReturnValue(Effect.succeed([])),
      replaceUserRoles: vi.fn().mockReturnValue(Effect.void),
      hasAdminRole: vi.fn().mockReturnValue(Effect.succeed(false)),
      hasAdminRoleForUser: vi.fn().mockReturnValue(Effect.succeed(false)),
      hasTenantMembership: vi.fn().mockReturnValue(Effect.succeed(true)),
      syncBetterAuthRole: vi.fn().mockReturnValue(Effect.void),
      deleteUserRoles: vi.fn().mockReturnValue(Effect.void),
    };
    const rolesService = {
      clearCacheForUser: vi.fn().mockReturnValue(Effect.void),
    };
    const service = await makeService({
      betterAuth,
      usersRepository,
      rolesService,
    });

    await run(
      service
        .banUser('user-1', {
          reason: 'abuse',
          expiresAt: '2026-04-01T00:00:00.000Z',
        })
        .pipe(
          Effect.provideService(BetterAuthHeaders, headers),
          Effect.provideService(CurrentRequestContext, requestContext),
        ),
    );
    await run(
      service
        .unbanUser('user-1')
        .pipe(
          Effect.provideService(BetterAuthHeaders, headers),
          Effect.provideService(CurrentRequestContext, requestContext),
        ),
    );

    expect(betterAuth.api.banUser).toHaveBeenCalled();
    expect(betterAuth.api.unbanUser).toHaveBeenCalledWith({
      headers,
      body: { userId: 'user-1' },
    });
  });

  it('revokes user sessions', async () => {
    const betterAuth = {
      api: {
        listUsers: vi
          .fn()
          .mockReturnValue(Promise.resolve({ users: [betterAuthUser] })),
        revokeUserSessions: vi.fn().mockReturnValue(Promise.resolve(undefined)),
      },
    };
    const usersRepository = {
      findRoleAssignments: vi.fn().mockReturnValue(Effect.succeed([])),
      findUserRoles: vi.fn().mockReturnValue(Effect.succeed([])),
      replaceUserRoles: vi.fn().mockReturnValue(Effect.void),
      hasAdminRole: vi.fn().mockReturnValue(Effect.succeed(false)),
      hasAdminRoleForUser: vi.fn().mockReturnValue(Effect.succeed(false)),
      syncBetterAuthRole: vi.fn().mockReturnValue(Effect.void),
      deleteUserRoles: vi.fn().mockReturnValue(Effect.void),
    };
    const rolesService = {
      clearCacheForUser: vi.fn().mockReturnValue(Effect.void),
    };
    const service = await makeService({
      betterAuth,
      usersRepository,
      rolesService,
    });

    await run(
      service
        .revokeSessions('user-1')
        .pipe(
          Effect.provideService(BetterAuthHeaders, headers),
          Effect.provideService(CurrentRequestContext, requestContext),
        ),
    );

    expect(betterAuth.api.revokeUserSessions).toHaveBeenCalledWith({
      headers,
      body: { userId: 'user-1' },
    });
  });
});
