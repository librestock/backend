import { Effect } from 'effect';
import { eq, and, asc, sql } from 'drizzle-orm';
import { DrizzleDatabase } from '../../platform/drizzle';
import { categories } from '../../platform/db/schema';
import { CategoriesInfrastructureError } from './categories.errors';

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new CategoriesInfrastructureError({
        action,
        cause,
        messageKey: 'categories.repositoryFailed',
      }),
  });

export class CategoriesRepository extends Effect.Service<CategoriesRepository>()(
  '@librestock/effect/CategoriesRepository',
  {
    effect: Effect.gen(function* () {
      const db = yield* DrizzleDatabase;

      const findAll = () =>
        tryAsync('list categories', () =>
          db.select().from(categories).orderBy(asc(categories.name)),
        );

      const findById = (id: string) =>
        tryAsync('load category', async () => {
          const rows = await db
            .select()
            .from(categories)
            .where(eq(categories.id, id))
            .limit(1);
          return rows[0] ?? null;
        });

      const existsById = (id: string) =>
        tryAsync('check category existence', async () => {
          const rows = await db
            .select({ id: categories.id })
            .from(categories)
            .where(eq(categories.id, id))
            .limit(1);
          return rows.length > 0;
        });

      const existsByName = (name: string, parentId?: string | null) =>
        tryAsync('check category name uniqueness', async () => {
          const conditions = [eq(categories.name, name)];
          if (parentId !== undefined && parentId !== null) {
            conditions.push(eq(categories.parent_id, parentId));
          }
          const rows = await db
            .select({ id: categories.id })
            .from(categories)
            .where(and(...conditions))
            .limit(1);
          return rows.length > 0;
        });

      const create = (data: typeof categories.$inferInsert) =>
        tryAsync('create category', async () => {
          const rows = await db.insert(categories).values(data).returning();
          return rows[0]!;
        });

      const update = (id: string, data: Partial<typeof categories.$inferInsert>) =>
        tryAsync('update category', async () => {
          const rows = await db
            .update(categories)
            .set({ ...data, updated_at: new Date() })
            .where(eq(categories.id, id))
            .returning({ id: categories.id });
          return rows.length;
        });

      const remove = (id: string) =>
        tryAsync('delete category', async () => {
          await db.delete(categories).where(eq(categories.id, id));
        });

      const findOne = (conditions: { id?: string; name?: string; parent_id?: string | null }) =>
        tryAsync('load category', async () => {
          const where: ReturnType<typeof eq>[] = [];
          if (conditions.id) where.push(eq(categories.id, conditions.id));
          if (conditions.name) where.push(eq(categories.name, conditions.name));
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

      const findAllDescendantIds = (parentId: string) =>
        tryAsync('find descendant categories', async () => {
          const allCategories = await db
            .select({ id: categories.id, parent_id: categories.parent_id })
            .from(categories);

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
