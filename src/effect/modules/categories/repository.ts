import { Context, Effect } from 'effect';
import { Repository } from 'typeorm';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { Category } from '../../../routes/categories/entities/category.entity';

export interface CategoriesRepository {
  readonly findAll: () => Promise<Category[]>;
  readonly findById: (id: string) => Promise<Category | null>;
  readonly existsById: (id: string) => Promise<boolean>;
  readonly existsByName: (name: string, parentId?: string | null) => Promise<boolean>;
  readonly create: (data: Partial<Category>) => Promise<Category>;
  readonly update: (id: string, data: Partial<Category>) => Promise<number>;
  readonly delete: (id: string) => Promise<void>;
  readonly findOne: (options: any) => Promise<Category | null>;
  readonly findAllDescendantIds: (parentId: string) => Promise<string[]>;
}

export const CategoriesRepository = Context.GenericTag<CategoriesRepository>(
  '@librestock/effect/CategoriesRepository',
);

const createCategoriesRepository = (
  repository: Repository<Category>,
): CategoriesRepository => ({
  findAll: () => repository.find({ order: { name: 'ASC' } }),
  findById: (id) => repository.findOneBy({ id }),
  existsById: (id) => repository.existsBy({ id }),
  existsByName: async (name, parentId) => {
    const count = await repository.countBy({
      name,
      parent_id: parentId ?? undefined,
    });
    return count > 0;
  },
  create: async (data) => {
    const category = repository.create(data);
    return repository.save(category);
  },
  update: async (id, data) => {
    const result = await repository
      .createQueryBuilder()
      .update(Category)
      .set(data)
      .where('id = :id', { id })
      .execute();
    return result.affected ?? 0;
  },
  delete: async (id) => {
    await repository.delete(id);
  },
  findOne: (options) => repository.findOne(options),
  findAllDescendantIds: async (parentId) => {
    const allCategories = await repository.find({
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
  },
});

export const makeCategoriesRepository = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;

  return createCategoriesRepository(dataSource.getRepository(Category));
});
