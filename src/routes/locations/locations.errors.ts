import { Data } from 'effect';

export class LocationNotFound extends Data.TaggedError('LocationNotFound')<{
  readonly id: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class LocationsInfrastructureError extends Data.TaggedError(
  'LocationsInfrastructureError',
)<{
  readonly action: string;
  readonly cause?: unknown;
  readonly message: string;
}> {
  readonly statusCode = 500 as const;
}
