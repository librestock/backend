import { Effect } from 'effect';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { DrizzleDatabase } from '../../platform/drizzle';
import { userRoles, roles } from '../../platform/db/schema';
import { UsersInfrastructureError } from './users.errors';

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new UsersInfrastructureError({
        action,
        cause,
        messageKey: 'users.repositoryFailed',
      }),
  });

export class UsersRepository extends Effect.Service<UsersRepository>()(
  '@librestock/effect/UsersRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const findRoleAssignments = (userIds: string[]) =>
        tryAsync('find role assignments', async () => {
          if (userIds.length === 0) return [];

          const rows = await db
            .select({
              id: userRoles.id,
              user_id: userRoles.user_id,
              role_id: userRoles.role_id,
              role: roles,
            })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.role_id, roles.id))
            .where(inArray(userRoles.user_id, userIds));

          return rows;
        });

      const findUserRoles = (userId: string) =>
        tryAsync('find user roles', async () => {
          const rows = await db
            .select({
              id: userRoles.id,
              user_id: userRoles.user_id,
              role_id: userRoles.role_id,
              role: roles,
            })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.role_id, roles.id))
            .where(eq(userRoles.user_id, userId));

          return rows;
        });

      const replaceUserRoles = (userId: string, roleIds: string[]) =>
        tryAsync('replace user roles', async () => {
          await db.delete(userRoles).where(eq(userRoles.user_id, userId));

          if (roleIds.length === 0) {
            return;
          }

          await db.insert(userRoles).values(
            roleIds.map((roleId) => ({
              user_id: userId,
              role_id: roleId,
            })),
          );
        });

      const hasAdminRole = (roleIds: string[]) =>
        tryAsync('check admin role', async () => {
          if (roleIds.length === 0) return false;

          const rows = await db
            .select({ id: roles.id })
            .from(roles)
            .where(
              and(
                inArray(roles.id, roleIds),
                sql`LOWER(${roles.name}) = LOWER('Admin')`,
              ),
            )
            .limit(1);

          return rows.length > 0;
        });

      const syncBetterAuthRole = (userId: string, role: 'admin' | 'user') =>
        tryAsync('sync better auth role', async () => {
          await db.execute(
            sql`UPDATE "user" SET role = ${role} WHERE id = ${userId}`,
          );
        });

      const deleteUserRoles = (userId: string) =>
        tryAsync('delete user roles', () =>
          db.delete(userRoles).where(eq(userRoles.user_id, userId)),
        );

      return {
        findRoleAssignments,
        findUserRoles,
        replaceUserRoles,
        hasAdminRole,
        syncBetterAuthRole,
        deleteUserRoles,
      };
    }),
  },
) {}
