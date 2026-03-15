import { Data } from 'effect';

export class AuditLogNotFound extends Data.TaggedError('AuditLogNotFound')<{
  readonly id: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class AuditLogsInfrastructureError extends Data.TaggedError(
  'AuditLogsInfrastructureError',
)<{
  readonly action: string;
  readonly cause?: unknown;
  readonly message: string;
}> {
  readonly statusCode = 500 as const;
}
