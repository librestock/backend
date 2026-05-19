import { Effect } from 'effect';
import { eq, asc, sql, type SQL } from 'drizzle-orm';
import { makeTryAsync } from '../../platform/try-async';
import { DrizzleDatabase } from '../../platform/drizzle';
import { categories } from '../../platform/db/schema';
import { TenantQuery } from '../../platform/tenant-query';
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
      const tenantQuery = yield* TenantQuery;

      const findAll = () =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenant(categories);
          return yield* tryAsync('list categories', () =>
            db
              .select()
              .from(categories)
              .where(where)
              .orderBy(asc(categories.name)),
          );
        });

      const findById = (id: string) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenantId(categories, id);
          return yield* tryAsync('load category', async () => {
            const rows = await db
              .select()
              .from(categories)
              .where(where)
              .limit(1);
            return rows[0] ?? null;
          });
        });

      const existsById = (id: string) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenantId(categories, id);
          return yield* tryAsync('check category existence', async () => {
            const rows = await db
              .select({ id: categories.id })
              .from(categories)
              .where(where)
              .limit(1);
            return rows.length > 0;
          });
        });

      const existsByName = (name: string, parentId?: string | null) =>
        Effect.gen(function* () {
          const conditions: SQL[] = [eq(categories.name, name)];
          if (parentId != null) {
            conditions.push(eq(categories.parent_id, parentId));
          }
          const where = yield* tenantQuery.whereTenant(
            categories,
            ...conditions,
          );
          return yield* tryAsync('check category name uniqueness', async () => {
            const rows = await db
              .select({ id: categories.id })
              .from(categories)
              .where(where)
              .limit(1);
            return rows.length > 0;
          });
        });

      const create = (data: typeof categories.$inferInsert) =>
        Effect.gen(function* () {
          const values = yield* tenantQuery.insertValues(data);
          return yield* tryAsync('create category', async () => {
            const rows = await db.insert(categories).values(values).returning();
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
          const where = yield* tenantQuery.whereTenantId(categories, id);
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
              .where(where)
              .returning({ id: categories.id });
            return rows.length;
          });
        });

      const remove = (id: string) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenantId(categories, id);
          return yield* tryAsync('delete category', async () => {
            await db.delete(categories).where(where);
          });
        });

      const findOne = (conditions: {
        id?: string;
        name?: string;
        parent_id?: string | null;
      }) =>
        Effect.gen(function* () {
          const filterConditions: SQL[] = [];
          if (conditions.id)
            filterConditions.push(eq(categories.id, conditions.id));
          if (conditions.name)
            filterConditions.push(eq(categories.name, conditions.name));
          if (conditions.parent_id !== undefined) {
            if (conditions.parent_id === null) {
              filterConditions.push(sql`${categories.parent_id} IS NULL`);
            } else {
              filterConditions.push(
                eq(categories.parent_id, conditions.parent_id),
              );
            }
          }
          const where = yield* tenantQuery.whereTenant(
            categories,
            ...filterConditions,
          );
          return yield* tryAsync('load category', async () => {
            const rows = await db
              .select()
              .from(categories)
              .where(where)
              .limit(1);
            return rows[0] ?? null;
          });
        });

      const findAllDescendantIds = (parentId: string) =>
        Effect.gen(function* () {
          const where = yield* tenantQuery.whereTenant(categories);
          return yield* tryAsync('find descendant categories', async () => {
            const allCategories = await db
              .select({ id: categories.id, parent_id: categories.parent_id })
              .from(categories)
              .where(where);

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
    dependencies: [TenantQuery.Default],
  },
) {}
