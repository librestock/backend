import { Data } from 'effect';

export class StockMovementNotFound extends Data.TaggedError('StockMovementNotFound')<{
  readonly id: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class StockMovementProductNotFound extends Data.TaggedError(
  'StockMovementProductNotFound',
)<{
  readonly productId: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class StockMovementLocationNotFound extends Data.TaggedError(
  'StockMovementLocationNotFound',
)<{
  readonly locationId: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class InvalidStockMovementProduct extends Data.TaggedError(
  'InvalidStockMovementProduct',
)<{
  readonly productId: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class InvalidSourceLocation extends Data.TaggedError(
  'InvalidSourceLocation',
)<{
  readonly locationId: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class InvalidDestinationLocation extends Data.TaggedError(
  'InvalidDestinationLocation',
)<{
  readonly locationId: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class StockMovementsInfrastructureError extends Data.TaggedError(
  'StockMovementsInfrastructureError',
)<{
  readonly action: string;
  readonly cause?: unknown;
  readonly message: string;
}> {
  readonly statusCode = 500 as const;
}
