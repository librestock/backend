import { Data } from 'effect';

export class BrandingInfrastructureError extends Data.TaggedError(
  'BrandingInfrastructureError',
)<{
  readonly action: string;
  readonly cause?: unknown;
  readonly message: string;
}> {
  readonly statusCode = 500 as const;
}

export class BrandingUnauthorized extends Data.TaggedError(
  'BrandingUnauthorized',
)<{
  readonly message: string;
}> {
  readonly statusCode = 401 as const;
}
