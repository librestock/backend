import { Effect } from 'effect';
import { eq, and, asc, sql } from 'drizzle-orm';
import { makeTryAsync } from '../../platform/try-async';
import { DrizzleDatabase } from '../../platform/drizzle';
import { categories } from '../../platform/db/schema';
import { requireRequestTenantId } from '../../platform/tenant-context';
import { CategoriesInfrastructureError } from './categories.errors';

const tryAsync = makeTryAsync(
  (action, cause) =>
    new CategoriesInfrastructureError({
      action,
      cause,
      messageKey: 'categories.repositoryFailed',
    }),
);

export class CategoriesRepository extends Effect.Service<CategoriesRepository>()(
  '@librestock/effect/categories/CategoriesRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const findAll = () =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('list categories', () =>
            db
              .select()
              .from(categories)
              .where(eq(categories.tenant_id, tenantId))
              .orderBy(asc(categories.name)),
          );
        });

      const findById = (id: string) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('load category', async () => {
            const rows = await db
              .select()
              .from(categories)
              .where(
                and(
                  eq(categories.tenant_id, tenantId),
                  eq(categories.id, id),
                ),
              )
              .limit(1);
            return rows[0] ?? null;
          });
        });

      const existsById = (id: string) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('check category existence', async () => {
            const rows = await db
              .select({ id: categories.id })
              .from(categories)
              .where(
                and(
                  eq(categories.tenant_id, tenantId),
                  eq(categories.id, id),
                ),
              )
              .limit(1);
            return rows.length > 0;
          });
        });

      const existsByName = (name: string, parentId?: string | null) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('check category name uniqueness', async () => {
            const conditions = [
              eq(categories.tenant_id, tenantId),
              eq(categories.name, name),
            ];
            if (parentId != null) {
              conditions.push(eq(categories.parent_id, parentId));
            }
            const rows = await db
              .select({ id: categories.id })
              .from(categories)
              .where(and(...conditions))
              .limit(1);
            return rows.length > 0;
          });
        });

      const create = (data: typeof categories.$inferInsert) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('create category', async () => {
            const rows = await db
              .insert(categories)
              .values({ ...data, tenant_id: tenantId })
              .returning();
            return rows[0]!;
          });
        });

      const update = (
        id: string,
        data: Omit<
          Partial<typeof categories.$inferInsert>,
          'id' | 'tenant_id' | 'created_at' | 'updated_at'
        >,
      ) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('update category', async () => {
            const {
              id: _id,
              tenant_id: _tenantId,
              created_at: _createdAt,
              updated_at: _updatedAt,
              ...updateData
            } = data as Partial<typeof categories.$inferInsert>;
            const rows = await db
              .update(categories)
              .set({ ...updateData, updated_at: new Date() })
              .where(
                and(
                  eq(categories.tenant_id, tenantId),
                  eq(categories.id, id),
                ),
              )
              .returning({ id: categories.id });
            return rows.length;
          });
        });

      const remove = (id: string) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('delete category', async () => {
            await db
              .delete(categories)
              .where(
                and(
                  eq(categories.tenant_id, tenantId),
                  eq(categories.id, id),
                ),
              );
          });
        });

      const findOne = (conditions: {
        id?: string;
        name?: string;
        parent_id?: string | null;
      }) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('load category', async () => {
            const where: ReturnType<typeof eq>[] = [
              eq(categories.tenant_id, tenantId),
            ];
            if (conditions.id) where.push(eq(categories.id, conditions.id));
            if (conditions.name)
              where.push(eq(categories.name, conditions.name));
            if (conditions.parent_id !== undefined) {
              if (conditions.parent_id === null) {
                where.push(sql`${categories.parent_id} IS NULL`);
              } else {
                where.push(eq(categories.parent_id, conditions.parent_id));
              }
            }
            const rows = await db
              .select()
              .from(categories)
              .where(and(...where))
              .limit(1);
            return rows[0] ?? null;
          });
        });

      const findAllDescendantIds = (parentId: string) =>
        Effect.gen(function* () {
          const tenantId = yield* requireRequestTenantId;
          return yield* tryAsync('find descendant categories', async () => {
            const allCategories = await db
              .select({ id: categories.id, parent_id: categories.parent_id })
              .from(categories)
              .where(eq(categories.tenant_id, tenantId));

            const childIds: string[] = [];
            const findChildren = (currentParentId: string) => {
              for (const category of allCategories) {
                if (category.parent_id === currentParentId) {
                  childIds.push(category.id);
                  findChildren(category.id);
                }
              }
            };
            findChildren(parentId);
            return childIds;
          });
        });

      return {
        findAll,
        findById,
        existsById,
        existsByName,
        create,
        update,
        delete: remove,
        findOne,
        findAllDescendantIds,
      };
    }),
  },
) {}
