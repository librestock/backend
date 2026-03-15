import { HttpServerError, HttpServerResponse } from '@effect/platform';
import { Effect, Cause, ParseResult } from 'effect';
import { TreeFormatter } from 'effect/ParseResult';
import { isAppError } from '../../common/effect/errors';
import { getRequestContext } from './request-context';

const STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

const getStatusName = (statusCode: number) =>
  STATUS_NAMES[statusCode] ?? 'Internal Server Error';

const withRequestIdHeader = (response: HttpServerResponse.HttpServerResponse) =>
  Effect.map(getRequestContext, ({ requestId }) =>
    HttpServerResponse.setHeader(response, 'x-request-id', requestId),
  );

const makeErrorEnvelope = (
  statusCode: number,
  error: string,
  message: string,
  path: string,
) => ({
  statusCode,
  error,
  message,
  path,
  timestamp: new Date().toISOString(),
});

const getFirstError = <E>(cause: Cause.Cause<E>): unknown => {
  const failureOption = Cause.failureOption(cause);
  if (failureOption._tag === 'Some') {
    return failureOption.value;
  }

  const defectOption = Cause.dieOption(cause);
  if (defectOption._tag === 'Some') {
    return defectOption.value;
  }

  return cause;
};

const toErrorDetails = (
  error: unknown,
  path: string,
): { statusCode: number; error: string; message: string } => {
  if (isAppError(error)) {
    return {
      statusCode: error.statusCode,
      error: getStatusName(error.statusCode),
      message:
        process.env.NODE_ENV === 'production' && error.statusCode >= 500
          ? 'Internal Server Error'
          : error.message,
    };
  }

  if (ParseResult.isParseError(error)) {
    return {
      statusCode: 400,
      error: getStatusName(400),
      message: TreeFormatter.formatErrorSync(error),
    };
  }

  if (error instanceof HttpServerError.RouteNotFound) {
    return {
      statusCode: 404,
      error: getStatusName(404),
      message: `Cannot ${error.request.method} ${path}`,
    };
  }

  if (error instanceof HttpServerError.RequestError) {
    return {
      statusCode: 400,
      error: getStatusName(400),
      message: error.description ?? error.message,
    };
  }

  if (error instanceof Error) {
    return {
      statusCode: 500,
      error: getStatusName(500),
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal Server Error'
          : error.message,
    };
  }

  return {
    statusCode: 500,
    error: getStatusName(500),
    message: 'Internal Server Error',
  };
};

export const respondCause = <E>(cause: Cause.Cause<E>) =>
  Effect.gen(function* () {
    const { path } = yield* getRequestContext;
    const firstError = getFirstError(cause);
    const details = toErrorDetails(firstError, path);

    if (details.statusCode >= 500) {
      console.error(`[effect-http] ${details.statusCode} ${path}`, firstError);
    }

    const response = HttpServerResponse.unsafeJson(
      makeErrorEnvelope(
        details.statusCode,
        details.error,
        details.message,
        path,
      ),
      { status: details.statusCode },
    );

    return yield* withRequestIdHeader(response);
  });

export const respondJson = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  options?: HttpServerResponse.Options.WithContentType,
) =>
  effect.pipe(
    Effect.flatMap((body) => HttpServerResponse.json(body, options)),
    Effect.catchAllCause(respondCause),
    Effect.flatMap(withRequestIdHeader),
  );

export const respondEmpty = <E, R>(
  effect: Effect.Effect<unknown, E, R>,
  options?: HttpServerResponse.Options.WithContent,
) =>
  effect.pipe(
    Effect.as(HttpServerResponse.empty(options)),
    Effect.catchAllCause(respondCause),
    Effect.flatMap(withRequestIdHeader),
  );

export const respondStaticJson = (
  body: unknown,
  options?: HttpServerResponse.Options.WithContentType,
) =>
  Effect.flatMap(HttpServerResponse.json(body, options), withRequestIdHeader).pipe(
    Effect.catchAllCause(respondCause),
  );
