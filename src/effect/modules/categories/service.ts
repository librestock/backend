import { Context, Effect } from 'effect';
import type { Category } from '../../../routes/categories/entities/category.entity';
import type { CategoryWithChildrenResponseDto } from '../../../routes/categories/dto/category-with-children-response.dto';
import type { CreateCategoryDto } from '../../../routes/categories/dto/create-category.dto';
import type { UpdateCategoryDto } from '../../../routes/categories/dto/update-category.dto';
import { categoryTryAsync } from '../../../routes/categories/categories.utils';
import {
  CategoriesInfrastructureError,
  CategoryCircularReference,
  CategoryNameAlreadyExists,
  CategoryNotFound,
  CategorySelfParent,
  ParentCategoryNotFound,
} from '../../../routes/categories/categories.errors';
import { CategoriesRepository } from './repository';

export interface CategoriesService {
  readonly findAll: () => Effect.Effect<
    CategoryWithChildrenResponseDto[],
    CategoriesInfrastructureError
  >;
  readonly create: (
    dto: CreateCategoryDto,
  ) => Effect.Effect<
    Category,
    CategoriesInfrastructureError | CategoryNameAlreadyExists | ParentCategoryNotFound
  >;
  readonly update: (
    id: string,
    dto: UpdateCategoryDto,
  ) => Effect.Effect<
    Category,
    | CategoriesInfrastructureError
    | CategoryCircularReference
    | CategoryNameAlreadyExists
    | CategoryNotFound
    | CategorySelfParent
    | ParentCategoryNotFound
  >;
  readonly delete: (
    id: string,
  ) => Effect.Effect<void, CategoriesInfrastructureError | CategoryNotFound>;
  readonly existsById: (id: string) => Promise<boolean>;
  readonly findAllDescendantIds: (parentId: string) => Promise<string[]>;
}

export const CategoriesService = Context.GenericTag<CategoriesService>(
  '@librestock/effect/CategoriesService',
);

const getCategoryOrFail = (
  repository: CategoriesRepository,
  id: string,
): Effect.Effect<Category, CategoriesInfrastructureError | CategoryNotFound> =>
  Effect.flatMap(
    categoryTryAsync('load category', () => repository.findById(id)),
    (category) =>
      category
        ? Effect.succeed(category)
        : Effect.fail(
            new CategoryNotFound({
              id,
              message: 'Category not found',
            }),
          ),
  );

const checkForCycle = (
  repository: CategoriesRepository,
  categoryId: string,
  newParentId: string,
): Effect.Effect<boolean, CategoriesInfrastructureError> =>
  Effect.gen(function* () {
    let currentId: string | null = newParentId;

    while (currentId) {
      if (currentId === categoryId) {
        return true;
      }

      const parent = yield* categoryTryAsync('load category parent', () =>
        repository.findOne({
          where: { id: currentId },
          select: ['parent_id'],
        }),
      );

      currentId = parent?.parent_id ?? null;
    }

    return false;
  });

const buildTree = (categories: Category[]): CategoryWithChildrenResponseDto[] => {
  const categoryMap = new Map<string, CategoryWithChildrenResponseDto>();
  const roots: CategoryWithChildrenResponseDto[] = [];

  for (const category of categories) {
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      parent_id: category.parent_id,
      description: category.description,
      created_at: category.created_at,
      updated_at: category.updated_at,
      children: [],
    });
  }

  for (const category of categories) {
    const node = categoryMap.get(category.id)!;

    if (category.parent_id && categoryMap.has(category.parent_id)) {
      const parent = categoryMap.get(category.parent_id)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
};

export const makeCategoriesService = Effect.gen(function* () {
  const repository = yield* CategoriesRepository;

  return {
    findAll: () =>
      Effect.map(
        categoryTryAsync('list categories', () => repository.findAll()),
        (categories) => buildTree(categories),
      ),
    create: (dto) =>
      Effect.gen(function* () {
        if (dto.parent_id) {
          const parentExists = yield* categoryTryAsync(
            'check parent category existence',
            () => repository.existsById(dto.parent_id!),
          );
          if (!parentExists) {
            return yield* Effect.fail(
              new ParentCategoryNotFound({
                parentId: dto.parent_id,
                message: 'Parent category not found',
              }),
            );
          }
        }

        const nameExists = yield* categoryTryAsync(
          'check category name uniqueness',
          () => repository.existsByName(dto.name, dto.parent_id),
        );
        if (nameExists) {
          return yield* Effect.fail(
            new CategoryNameAlreadyExists({
              name: dto.name,
              parentId: dto.parent_id,
              message: 'Category with this name already exists',
            }),
          );
        }

        return yield* categoryTryAsync('create category', () =>
          repository.create({
            name: dto.name,
            parent_id: dto.parent_id ?? null,
            description: dto.description ?? null,
          }),
        );
      }),
    update: (id, dto) =>
      Effect.gen(function* () {
        const category = yield* getCategoryOrFail(repository, id);

        if (dto.parent_id !== undefined) {
          if (dto.parent_id === id) {
            return yield* Effect.fail(
              new CategorySelfParent({
                id,
                message: 'Category cannot be its own parent',
              }),
            );
          }

          if (dto.parent_id) {
            const parentExists = yield* categoryTryAsync(
              'check parent category existence',
              () => repository.existsById(dto.parent_id!),
            );
            if (!parentExists) {
              return yield* Effect.fail(
                new ParentCategoryNotFound({
                  parentId: dto.parent_id,
                  message: 'Parent category not found',
                }),
              );
            }

            const wouldCreateCycle = yield* checkForCycle(
              repository,
              id,
              dto.parent_id,
            );
            if (wouldCreateCycle) {
              return yield* Effect.fail(
                new CategoryCircularReference({
                  id,
                  parentId: dto.parent_id,
                  message:
                    'Cannot set parent: would create a circular reference',
                }),
              );
            }
          }
        }

        const targetName = dto.name ?? category.name;
        const targetParentId =
          dto.parent_id !== undefined ? dto.parent_id : category.parent_id;

        if (
          targetName !== category.name ||
          targetParentId !== category.parent_id
        ) {
          const nameExists = yield* categoryTryAsync(
            'check category name uniqueness',
            () => repository.existsByName(targetName, targetParentId),
          );
          if (nameExists) {
            return yield* Effect.fail(
              new CategoryNameAlreadyExists({
                name: targetName,
                parentId: targetParentId,
                message: 'Category with this name already exists',
              }),
            );
          }
        }

        const updateData: Partial<Category> = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.parent_id !== undefined) updateData.parent_id = dto.parent_id;
        if (dto.description !== undefined)
          updateData.description = dto.description;

        if (Object.keys(updateData).length === 0) {
          return category;
        }

        yield* categoryTryAsync('update category', () =>
          repository.update(id, updateData),
        );

        return yield* getCategoryOrFail(repository, id);
      }),
    delete: (id) =>
      Effect.gen(function* () {
        yield* getCategoryOrFail(repository, id);
        yield* categoryTryAsync('delete category', () =>
          repository.delete(id),
        );
      }),
    existsById: (id) => repository.existsById(id),
    findAllDescendantIds: (parentId) => repository.findAllDescendantIds(parentId),
  } satisfies CategoriesService;
});
