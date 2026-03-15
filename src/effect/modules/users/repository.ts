import { Context, Effect } from 'effect';
import { DataSource, In, Repository } from 'typeorm';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { UserRoleEntity } from './entities/user-role.entity';
import { RoleEntity } from '../roles/entities/role.entity';

export interface UsersRepository {
  readonly findRoleAssignments: (userIds: string[]) => Promise<UserRoleEntity[]>;
  readonly findUserRoles: (userId: string) => Promise<UserRoleEntity[]>;
  readonly replaceUserRoles: (userId: string, roleIds: string[]) => Promise<void>;
  readonly hasAdminRole: (roleIds: string[]) => Promise<boolean>;
  readonly syncBetterAuthRole: (userId: string, role: 'admin' | 'user') => Promise<void>;
  readonly deleteUserRoles: (userId: string) => Promise<void>;
}

export const UsersRepository = Context.GenericTag<UsersRepository>(
  '@librestock/effect/UsersRepository',
);

const createUsersRepository = (
  userRoleRepository: Repository<UserRoleEntity>,
  dataSource: DataSource,
): UsersRepository => ({
  findRoleAssignments: (userIds) =>
    userIds.length === 0
      ? Promise.resolve([])
      : userRoleRepository.find({
          where: { user_id: In(userIds) },
          relations: ['role'],
        }),
  findUserRoles: (userId) =>
    userRoleRepository.find({
      where: { user_id: userId },
      relations: ['role'],
    }),
  replaceUserRoles: async (userId, roleIds) => {
    await userRoleRepository.delete({ user_id: userId });

    if (roleIds.length === 0) {
      return;
    }

    const entities = roleIds.map((roleId) =>
      userRoleRepository.create({ user_id: userId, role_id: roleId }),
    );

    await userRoleRepository.save(entities);
  },
  hasAdminRole: async (roleIds) => {
    if (roleIds.length === 0) {
      return false;
    }

    const count = await dataSource
      .getRepository(RoleEntity)
      .createQueryBuilder('r')
      .where('r.id IN (:...roleIds)', { roleIds })
      .andWhere('LOWER(r.name) = LOWER(:name)', { name: 'Admin' })
      .getCount();

    return count > 0;
  },
  syncBetterAuthRole: async (userId, role) => {
    await dataSource.query(`UPDATE "user" SET role = $1 WHERE id = $2`, [
      role,
      userId,
    ]);
  },
  deleteUserRoles: async (userId) => {
    await userRoleRepository.delete({ user_id: userId });
  },
});

export const makeUsersRepository = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;

  return createUsersRepository(
    dataSource.getRepository(UserRoleEntity),
    dataSource,
  );
});
