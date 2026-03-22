import { Effect } from 'effect';
import { eq, asc } from 'drizzle-orm';
import { DrizzleDatabase } from '../../platform/drizzle';
import { roles, rolePermissions } from '../../platform/db/schema';
import { RolesInfrastructureError } from './roles.errors';

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new RolesInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

export class RolesRepository extends Effect.Service<RolesRepository>()(
  '@librestock/effect/RolesRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const findAll = () =>
        tryAsync('list roles', async () => {
          const allRoles = await db
            .select()
            .from(roles)
            .orderBy(asc(roles.name));

          const allPermissions = await db.select().from(rolePermissions);

          return allRoles.map((role) => ({
            ...role,
            permissions: allPermissions.filter((p) => p.role_id === role.id),
          }));
        });

      const findById = (id: string) =>
        tryAsync('load role', async () => {
          const rows = await db
            .select()
            .from(roles)
            .where(eq(roles.id, id))
            .limit(1);
          if (!rows[0]) return null;

          const perms = await db
            .select()
            .from(rolePermissions)
            .where(eq(rolePermissions.role_id, id));

          return { ...rows[0], permissions: perms };
        });

      const findByName = (name: string) =>
        tryAsync('load role by name', async () => {
          const rows = await db
            .select()
            .from(roles)
            .where(eq(roles.name, name))
            .limit(1);
          if (!rows[0]) return null;

          const perms = await db
            .select()
            .from(rolePermissions)
            .where(eq(rolePermissions.role_id, rows[0].id));

          return { ...rows[0], permissions: perms };
        });

      const create = (data: typeof roles.$inferInsert) =>
        tryAsync('create role', async () => {
          const rows = await db.insert(roles).values(data).returning();
          return { ...rows[0]!, permissions: [] };
        });

      const update = (id: string, data: Partial<typeof roles.$inferInsert>) =>
        tryAsync('update role', async () => {
          await db
            .update(roles)
            .set({ ...data, updated_at: new Date() })
            .where(eq(roles.id, id));
        });

      const remove = (id: string) =>
        tryAsync('delete role', async () => {
          await db.delete(roles).where(eq(roles.id, id));
        });

      const replacePermissions = (
        roleId: string,
        permissions: { resource: string; permission: string }[],
      ) =>
        tryAsync('replace role permissions', async () => {
          await db
            .delete(rolePermissions)
            .where(eq(rolePermissions.role_id, roleId));

          if (permissions.length === 0) {
            return;
          }

          await db.insert(rolePermissions).values(
            permissions.map((p) => ({
              role_id: roleId,
              resource: p.resource,
              permission: p.permission,
            })),
          );
        });

      return {
        findAll,
        findById,
        findByName,
        create,
        update,
        delete: remove,
        replacePermissions,
      };
    }),
  },
) {}
