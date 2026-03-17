import { Data } from 'effect';

export class ProductNotFound extends Data.TaggedError('ProductNotFound')<{
  readonly productId: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class CategoryNotFound extends Data.TaggedError('CategoryNotFound')<{
  readonly categoryId: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class SkuAlreadyExists extends Data.TaggedError('SkuAlreadyExists')<{
  readonly sku: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class PriceBelowCost extends Data.TaggedError('PriceBelowCost')<{
  readonly standardPrice: number;
  readonly standardCost: number;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class ProductNotDeleted extends Data.TaggedError('ProductNotDeleted')<{
  readonly productId: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class ProductsInfrastructureError extends Data.TaggedError(
  'ProductInfrastructureError',
)<{
  readonly action: string;
  readonly message: string;
  readonly cause?: unknown;
}> {
  readonly statusCode = 500 as const;
}
