import { Effect, type Cause } from 'effect';
import { HttpException, HttpStatus } from '@nestjs/common';
import { isAppError } from './errors';

// Symbol used by Effect's FiberFailure to store the Cause
const FiberFailureCauseSymbol = Symbol.for(
  'effect/Runtime/FiberFailure/Cause',
);

/**
 * Extract the original error from an Effect FiberFailure wrapper.
 *
 * Effect.runPromise rejects with a FiberFailureImpl that wraps a Cause.
 * For expected failures (Effect.fail), the Cause is Fail({ error }).
 * For defects (Effect.die), the Cause is Die({ defect }).
 */
function unwrapFiberFailure(thrown: unknown): unknown {
  if (
    thrown !== null &&
    typeof thrown === 'object' &&
    FiberFailureCauseSymbol in thrown
  ) {
    const cause = (thrown as Record<symbol, unknown>)[
      FiberFailureCauseSymbol
    ] as Cause.Cause<unknown>;

    // Expected failure → extract the error value
    if (cause._tag === 'Fail') {
      return cause.error;
    }
    // Defect → extract the defect value
    if (cause._tag === 'Die') {
      return cause.defect;
    }
  }
  return thrown;
}

/**
 * Bridge between Effect and NestJS controllers.
 *
 * Runs an Effect to completion, mapping any domain error (carrying `statusCode`
 * and `message`) into an `HttpException` that the GlobalExceptionFilter already
 * knows how to render.
 *
 * Usage in a controller:
 *   @Get(':id')
 *   findOne(@Param('id') id: string) {
 *     return runEffect(this.productsService.findOne(id));
 *   }
 */
export async function runEffect<A, E>(
  effect: Effect.Effect<A, E>,
): Promise<A> {
  try {
    return await Effect.runPromise(effect);
  } catch (error_: unknown) {
    const error = unwrapFiberFailure(error_);

    // Domain error with statusCode → map to HttpException
    if (isAppError(error)) {
      throw new HttpException(error.message, error.statusCode);
    }

    // Already an HttpException (e.g. from NestJS guards/interceptors)
    if (error instanceof HttpException) {
      throw error;
    }

    // Unexpected / defect — let the global filter handle it as a 500
    throw new HttpException(
      'Internal Server Error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
