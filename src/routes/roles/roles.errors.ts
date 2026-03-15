import { Data } from 'effect';

export class RoleNotFound extends Data.TaggedError('RoleNotFound')<{
  readonly id: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class RoleNameAlreadyExists extends Data.TaggedError('RoleNameAlreadyExists')<{
  readonly name: string;
  readonly message: string;
}> {
  readonly statusCode = 409 as const;
}

export class SystemRoleDeletionForbidden extends Data.TaggedError(
  'SystemRoleDeletionForbidden',
)<{
  readonly id: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class RolesInfrastructureError extends Data.TaggedError(
  'RolesInfrastructureError',
)<{
  readonly action: string;
  readonly cause?: unknown;
  readonly message: string;
}> {
  readonly statusCode = 500 as const;
}
