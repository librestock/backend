import { Effect } from 'effect';
import type { FindOneOptions } from 'typeorm';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { Category } from './entities/category.entity';
import { CategoriesInfrastructureError } from './categories.errors';

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new CategoriesInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

export class CategoriesRepository extends Effect.Service<CategoriesRepository>()(
  '@librestock/effect/CategoriesRepository',
  {
    effect: Effect.gen(function* () {
      const dataSource = yield* TypeOrmDataSource;
      const repo = dataSource.getRepository(Category);

      const findAll = () =>
        tryAsync('list categories', () =>
          repo.find({ order: { name: 'ASC' } }),
        );

      const findById = (id: string) =>
        tryAsync('load category', () => repo.findOneBy({ id }));

      const existsById = (id: string) =>
        tryAsync('check category existence', () => repo.existsBy({ id }));

      const existsByName = (name: string, parentId?: string | null) =>
        tryAsync('check category name uniqueness', async () => {
          const count = await repo.countBy({
            name,
            parent_id: parentId ?? undefined,
          });
          return count > 0;
        });

      const create = (data: Partial<Category>) =>
        tryAsync('create category', async () => {
          const category = repo.create(data);
          return repo.save(category);
        });

      const update = (id: string, data: Partial<Category>) =>
        tryAsync('update category', async () => {
          const result = await repo
            .createQueryBuilder()
            .update(Category)
            .set(data)
            .where('id = :id', { id })
            .execute();
          return result.affected ?? 0;
        });

      const remove = (id: string) =>
        tryAsync('delete category', async () => {
          await repo.delete(id);
        });

      const findOne = (options: FindOneOptions<Category>) =>
        tryAsync('load category', () => repo.findOne(options));

      const findAllDescendantIds = (parentId: string) =>
        tryAsync('find descendant categories', async () => {
          const allCategories = await repo.find({
            select: ['id', 'parent_id'],
          });

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
