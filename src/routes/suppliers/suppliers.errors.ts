import { Data } from 'effect';

export class SupplierNotFound extends Data.TaggedError('SupplierNotFound')<{
  readonly id: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class SuppliersInfrastructureError extends Data.TaggedError(
  'SuppliersInfrastructureError',
)<{
  readonly action: string;
  readonly cause?: unknown;
  readonly message: string;
}> {
  readonly statusCode = 500 as const;
}
