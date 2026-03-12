import { Data } from 'effect';

type AppErrorFields = {
  readonly message: string;
};

type AppErrorInstance<
  Tag extends string,
  StatusCode extends number,
  Fields extends object = {},
> = AppError<Tag, StatusCode> & Readonly<Fields>;

type AppErrorConstructor<
  Tag extends string,
  StatusCode extends number,
  BaseFields extends object = AppErrorFields,
> = new <Fields extends object = {}>(
  args: Readonly<Fields & BaseFields>,
) => AppErrorInstance<Tag, StatusCode, Fields & BaseFields>;

/**
 * Convention for Effect domain errors in this codebase:
 *
 * - Every domain error extends Data.TaggedError with a unique _tag
 * - Every error carries a `message` (human-readable) and `statusCode` (HTTP mapping)
 * - The `runEffect` bridge reads these to produce the correct NestJS HttpException
 *
 * Usage:
 *   class ProductNotFound extends NotFoundError("ProductNotFound")<{ readonly id: string }> {}
 *   yield* new ProductNotFound({ id, message: "Product not found" })
 */

// ---------------------------------------------------------------------------
// Type guard used by runEffect to detect our domain errors
// ---------------------------------------------------------------------------

export interface AppError<
  Tag extends string = string,
  StatusCode extends number = number,
> extends Error {
  readonly _tag: Tag;
  readonly message: string;
  readonly statusCode: StatusCode;
}

const isRecord = (value: unknown): value is Record<PropertyKey, unknown> =>
  value !== null && typeof value === 'object';

export const isAppError = (value: unknown): value is AppError =>
  isRecord(value) &&
  typeof value._tag === 'string' &&
  typeof value.message === 'string' &&
  typeof value.statusCode === 'number';

// ---------------------------------------------------------------------------
// Branded factory helpers — produce a TaggedError subclass pre-wired with
// the correct HTTP status code. Domain modules extend these.
//
// The returned constructor stays generic over extra payload fields while still
// enforcing that every instance has a message and statusCode.
// ---------------------------------------------------------------------------

/**
 * Create a factory that produces TaggedError subclasses with a fixed statusCode.
 * Extra payload fields are carried by the generic constructor signature, so
 * subclasses can add domain-specific context without re-declaring `message`.
 */
function makeErrorFactory<StatusCode extends number>(statusCode: StatusCode) {
  return <Tag extends string>(
    tag: Tag,
  ): AppErrorConstructor<Tag, StatusCode> => {
    class EffectError extends Data.TaggedError(tag)<AppErrorFields> {
      readonly statusCode: StatusCode = statusCode;

      constructor(args: Readonly<object & AppErrorFields>) {
        super(args);
      }
    }

    return EffectError as AppErrorConstructor<Tag, StatusCode>;
  };
}

export const NotFoundError = makeErrorFactory(404);
export const BadRequestError = makeErrorFactory(400);
export const ConflictError = makeErrorFactory(409);
export const ForbiddenError = makeErrorFactory(403);
export const UnauthorizedError = makeErrorFactory(401);
export const InternalError = makeErrorFactory(500);
