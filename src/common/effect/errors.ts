import { Data } from 'effect';

/**
 * Convention for Effect domain errors in this codebase:
 *
 * - Every domain error extends Data.TaggedError with a unique _tag
 * - Every error carries a `message` (human-readable) and `statusCode` (HTTP mapping)
 * - The `runEffect` bridge reads these to produce the correct NestJS HttpException
 *
 * Usage:
 *   class ProductNotFound extends NotFoundError("ProductNotFound")<{ id: string }> {}
 *   yield* new ProductNotFound({ id, message: "Product not found" })
 */

// ---------------------------------------------------------------------------
// Branded factory helpers — produce a TaggedError subclass pre-wired with
// the correct HTTP status code. Domain modules extend these.
// ---------------------------------------------------------------------------

export const NotFoundError = <Tag extends string>(tag: Tag) =>
  class extends Data.TaggedError(tag)<{ readonly message: string }> {
    readonly statusCode = 404 as const;
  };

export const BadRequestError = <Tag extends string>(tag: Tag) =>
  class extends Data.TaggedError(tag)<{ readonly message: string }> {
    readonly statusCode = 400 as const;
  };

export const ConflictError = <Tag extends string>(tag: Tag) =>
  class extends Data.TaggedError(tag)<{ readonly message: string }> {
    readonly statusCode = 409 as const;
  };

export const ForbiddenError = <Tag extends string>(tag: Tag) =>
  class extends Data.TaggedError(tag)<{ readonly message: string }> {
    readonly statusCode = 403 as const;
  };

export const UnauthorizedError = <Tag extends string>(tag: Tag) =>
  class extends Data.TaggedError(tag)<{ readonly message: string }> {
    readonly statusCode = 401 as const;
  };

export const InternalError = <Tag extends string>(tag: Tag) =>
  class extends Data.TaggedError(tag)<{
    readonly message: string;
    readonly cause?: unknown;
  }> {
    readonly statusCode = 500 as const;
  };

// ---------------------------------------------------------------------------
// Type guard used by runEffect to detect our domain errors
// ---------------------------------------------------------------------------

export interface AppError {
  readonly _tag: string;
  readonly message: string;
  readonly statusCode: number;
}

export const isAppError = (u: unknown): u is AppError =>
  u !== null &&
  typeof u === 'object' &&
  '_tag' in u &&
  'message' in u &&
  'statusCode' in u &&
  typeof (u as AppError).statusCode === 'number';
