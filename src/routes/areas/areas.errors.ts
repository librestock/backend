import { Data } from 'effect';

export class AreaNotFound extends Data.TaggedError('AreaNotFound')<{
  readonly id: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class AreaLocationNotFound extends Data.TaggedError(
  'AreaLocationNotFound',
)<{
  readonly locationId: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class ParentAreaNotFound extends Data.TaggedError('ParentAreaNotFound')<{
  readonly parentId: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class AreaSelfParent extends Data.TaggedError('AreaSelfParent')<{
  readonly id: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class AreaParentLocationMismatch extends Data.TaggedError(
  'AreaParentLocationMismatch',
)<{
  readonly parentId: string;
  readonly locationId: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class AreaCircularReference extends Data.TaggedError(
  'AreaCircularReference',
)<{
  readonly id: string;
  readonly parentId: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class AreasInfrastructureError extends Data.TaggedError(
  'AreasInfrastructureError',
)<{
  readonly action: string;
  readonly cause?: unknown;
  readonly message: string;
}> {
  readonly statusCode = 500 as const;
}
