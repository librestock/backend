import { Data } from 'effect';

export class ClientNotFound extends Data.TaggedError('ClientNotFound')<{
  readonly id: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class ClientEmailAlreadyExists extends Data.TaggedError(
  'ClientEmailAlreadyExists',
)<{
  readonly email: string;
  readonly message: string;
}> {
  readonly statusCode = 409 as const;
}

export class ClientsInfrastructureError extends Data.TaggedError(
  'ClientsInfrastructureError',
)<{
  readonly action: string;
  readonly cause?: unknown;
  readonly message: string;
}> {
  readonly statusCode = 500 as const;
}
