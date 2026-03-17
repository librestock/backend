import { Effect, Layer } from 'effect';
import { Permission, Resource } from '@librestock/types/auth';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { RolesService } from './service';
import { RolesRepository } from './repository';
import { SystemRoleDeletionForbidden } from './roles.errors';

describe('Effect RolesService', () => {
  const makeService = async (
    repository: Record<string, jest.Mock>,
    dataSource: { query: jest.Mock },
  ) =>
    Effect.runPromise(
      RolesService.pipe(
        Effect.provide(
          RolesService.DefaultWithoutDependencies.pipe(
            Layer.provide(
              Layer.mergeAll(
                Layer.succeed(RolesRepository, repository as any),
                Layer.succeed(TypeOrmDataSource, dataSource as any),
              ),
            ),
          ),
        ),
      ),
    );

  const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
  const fail = <A, E>(effect: Effect.Effect<A, E>) =>
    Effect.runPromise(Effect.flip(effect));

  const roleEntity = {
    id: 'role-1',
    name: 'Admin',
    description: 'Full system access',
    is_system: true,
    permissions: [
      {
        role_id: 'role-1',
        resource: Resource.ROLES,
        permission: Permission.READ,
      },
    ],
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('creates a role', async () => {
    const repository = {
      findAll: jest.fn(),
      findById: jest.fn().mockReturnValue(
        Effect.succeed({
          ...roleEntity,
          id: 'role-2',
          name: 'Manager',
          description: 'Warehouse manager',
          is_system: false,
        }),
      ),
      findByName: jest.fn().mockReturnValue(Effect.succeed(null)),
      create: jest.fn().mockReturnValue(
        Effect.succeed({
          ...roleEntity,
          id: 'role-2',
          name: 'Manager',
          description: 'Warehouse manager',
          is_system: false,
        }),
      ),
      update: jest.fn(),
      delete: jest.fn(),
      replacePermissions: jest.fn().mockReturnValue(Effect.succeed(undefined)),
    };
    const dataSource = { query: jest.fn() };
    const service = await makeService(repository, dataSource);

    const result = await run(
      service.create({
        name: 'Manager',
        description: 'Warehouse manager',
        permissions: [
          { resource: Resource.ROLES, permission: Permission.READ },
        ],
      }),
    );

    expect(repository.create).toHaveBeenCalledWith({
      name: 'Manager',
      description: 'Warehouse manager',
      is_system: false,
    });
    expect(result.name).toBe('Manager');
  });

  it('rejects duplicate role names', async () => {
    const repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn().mockReturnValue(Effect.succeed(roleEntity)),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      replacePermissions: jest.fn(),
    };
    const service = await makeService(repository, { query: jest.fn() });

    await expect(
      fail(
        service.create({
          name: 'Admin',
          permissions: [],
        }),
      ),
    ).resolves.toMatchObject({
      _tag: 'RoleNameAlreadyExists',
      statusCode: 409,
    });
  });

  it('updates a role', async () => {
    const repository = {
      findAll: jest.fn(),
      findById: jest
        .fn()
        .mockReturnValueOnce(
          Effect.succeed({
            ...roleEntity,
            id: 'role-2',
            name: 'Manager',
            description: 'Old',
            is_system: false,
          }),
        )
        .mockReturnValueOnce(
          Effect.succeed({
            ...roleEntity,
            id: 'role-2',
            name: 'Manager Updated',
            description: 'New',
            is_system: false,
          }),
        ),
      findByName: jest.fn().mockReturnValue(Effect.succeed(null)),
      create: jest.fn(),
      update: jest.fn().mockReturnValue(Effect.succeed(undefined)),
      delete: jest.fn(),
      replacePermissions: jest.fn().mockReturnValue(Effect.succeed(undefined)),
    };
    const service = await makeService(repository, { query: jest.fn() });

    const result = await run(
      service.update('role-2', {
        name: 'Manager Updated',
        description: 'New',
        permissions: [
          { resource: Resource.ROLES, permission: Permission.WRITE },
        ],
      }),
    );

    expect(repository.update).toHaveBeenCalledWith('role-2', {
      name: 'Manager Updated',
      description: 'New',
    });
    expect(repository.replacePermissions).toHaveBeenCalled();
    expect(result.name).toBe('Manager Updated');
  });

  it('prevents deleting a system role', async () => {
    const repository = {
      findAll: jest.fn(),
      findById: jest.fn().mockReturnValue(Effect.succeed(roleEntity)),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      replacePermissions: jest.fn(),
    };
    const service = await makeService(repository, { query: jest.fn() });

    await expect(fail(service.delete('role-1'))).resolves.toBeInstanceOf(
      SystemRoleDeletionForbidden,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('caches permissions and refreshes after ttl expiry', async () => {
    const repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      replacePermissions: jest.fn(),
    };
    const dataSource = {
      query: jest.fn().mockResolvedValue([
        {
          role_name: 'Admin',
          resource: Resource.ROLES,
          permission: Permission.READ,
        },
      ]),
    };
    const service = await makeService(repository, dataSource);
    let now = 1_000;
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);

    await run(service.getPermissionsForUser('user-1'));
    await run(service.getPermissionsForUser('user-1'));
    now += 61_000;
    await run(service.getPermissionsForUser('user-1'));

    expect(dataSource.query).toHaveBeenCalledTimes(2);
    nowSpy.mockRestore();
  });
});
