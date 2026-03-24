import { Effect, Layer } from 'effect';
import { Permission, Resource } from '@librestock/types/auth';
import { RolesService } from '../modules/roles/service';
import { RolesInfrastructureError } from '../modules/roles/roles.errors';
import { requirePermission, PermissionDenied } from './authorization';

const mockRequireSession = jest.fn();

jest.mock('./session', () => {
  const { Effect } = jest.requireActual<typeof import('effect')>('effect');

  return {
    requireSession: Effect.suspend(() => mockRequireSession()),
  };
});

describe('requirePermission', () => {
  const run = <A, E>(effect: Effect.Effect<A, E, any>) =>
    Effect.runPromise(effect as Effect.Effect<A, E, never>);
  const fail = <A, E>(effect: Effect.Effect<A, E, any>) =>
    Effect.runPromise(Effect.flip(effect as Effect.Effect<A, E, never>));

  const rolesService = {
    getPermissionsForUser: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes when the user has the required permission', async () => {
    mockRequireSession.mockReturnValue(
      Effect.succeed({
        user: { id: 'user-1' },
      }),
    );
    rolesService.getPermissionsForUser.mockReturnValue(
      Effect.succeed({
        roleNames: ['Admin'],
        permissions: {
          [Resource.ROLES]: [Permission.READ],
        },
      }),
    );

    await expect(
      run(
        requirePermission(Resource.ROLES, Permission.READ).pipe(
          Effect.provide(
            Layer.succeed(RolesService, rolesService as any),
          ),
        ),
      ),
    ).resolves.toBeUndefined();
  });

  it('fails with 403 when the user lacks the permission', async () => {
    mockRequireSession.mockReturnValue(
      Effect.succeed({
        user: { id: 'user-1' },
      }),
    );
    rolesService.getPermissionsForUser.mockReturnValue(
      Effect.succeed({
        roleNames: ['Viewer'],
        permissions: {
          [Resource.ROLES]: [Permission.READ],
        },
      }),
    );

    await expect(
      fail(
        requirePermission(Resource.ROLES, Permission.WRITE).pipe(
          Effect.provide(
            Layer.succeed(RolesService, rolesService as any),
          ),
        ),
      ),
    ).resolves.toBeInstanceOf(PermissionDenied);
  });

  it('propagates unauthenticated failures', async () => {
    mockRequireSession.mockReturnValue(
      Effect.fail({
        _tag: 'SessionUnauthorized',
        messageKey: 'auth.unauthorized',
        message: 'Unauthorized',
        statusCode: 401,
      }),
    );

    await expect(
      fail(
        requirePermission(Resource.ROLES, Permission.READ).pipe(
          Effect.provide(
            Layer.succeed(RolesService, rolesService as any),
          ),
        ),
      ),
    ).resolves.toMatchObject({
      _tag: 'SessionUnauthorized',
      statusCode: 401,
    });
  });

  it('propagates roles infrastructure errors', async () => {
    mockRequireSession.mockReturnValue(
      Effect.succeed({
        user: { id: 'user-1' },
      }),
    );
    rolesService.getPermissionsForUser.mockReturnValue(
      Effect.fail(
        new RolesInfrastructureError({
          action: 'load permissions',
          messageKey: 'roles.loadPermissionsFailed',
        }),
      ),
    );

    await expect(
      fail(
        requirePermission(Resource.ROLES, Permission.READ).pipe(
          Effect.provide(
            Layer.succeed(RolesService, rolesService as any),
          ),
        ),
      ),
    ).resolves.toMatchObject({
      _tag: 'RolesInfrastructureError',
      statusCode: 500,
    });
  });
});
