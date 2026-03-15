import { Data } from 'effect';

export class CategoryNotFound extends Data.TaggedError('CategoryNotFound')<{
  readonly id: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class ParentCategoryNotFound extends Data.TaggedError(
  'ParentCategoryNotFound',
)<{
  readonly parentId: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class CategoryNameAlreadyExists extends Data.TaggedError(
  'CategoryNameAlreadyExists',
)<{
  readonly name: string;
  readonly parentId?: string | null;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class CategorySelfParent extends Data.TaggedError('CategorySelfParent')<{
  readonly id: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class CategoryCircularReference extends Data.TaggedError(
  'CategoryCircularReference',
)<{
  readonly id: string;
  readonly parentId: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class CategoriesInfrastructureError extends Data.TaggedError(
  'CategoriesInfrastructureError',
)<{
  readonly action: string;
  readonly cause?: unknown;
  readonly message: string;
}> {
  readonly statusCode = 500 as const;
}
