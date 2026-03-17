import { Data } from 'effect';

export class InventoryNotFound extends Data.TaggedError('InventoryNotFound')<{
  readonly id: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class InventoryProductNotFound extends Data.TaggedError(
  'InventoryProductNotFound',
)<{
  readonly productId: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class InventoryLocationNotFound extends Data.TaggedError(
  'InventoryLocationNotFound',
)<{
  readonly locationId: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class InvalidInventoryProduct extends Data.TaggedError(
  'InvalidInventoryProduct',
)<{
  readonly productId: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class InvalidInventoryLocation extends Data.TaggedError(
  'InvalidInventoryLocation',
)<{
  readonly locationId: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class InvalidInventoryArea extends Data.TaggedError('InvalidInventoryArea')<{
  readonly areaId: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class InventoryAreaLocationMismatch extends Data.TaggedError(
  'InventoryAreaLocationMismatch',
)<{
  readonly areaId: string;
  readonly locationId: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class InventoryAlreadyExists extends Data.TaggedError(
  'InventoryAlreadyExists',
)<{
  readonly productId: string;
  readonly locationId: string;
  readonly areaId?: string | null;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class InventoryQuantityAdjustmentFailed extends Data.TaggedError(
  'InventoryQuantityAdjustmentFailed',
)<{
  readonly id: string;
  readonly adjustment: number;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class InventoryInfrastructureError extends Data.TaggedError(
  'InventoryInfrastructureError',
)<{
  readonly action: string;
  readonly cause?: unknown;
  readonly message: string;
}> {
  readonly statusCode = 500 as const;
}
