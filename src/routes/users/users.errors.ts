import { Data } from 'effect';

export class UserNotFound extends Data.TaggedError('UserNotFound')<{
  readonly id: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class UsersInfrastructureError extends Data.TaggedError(
  'UsersInfrastructureError',
)<{
  readonly action: string;
  readonly cause?: unknown;
  readonly message: string;
}> {
  readonly statusCode = 500 as const;
}
