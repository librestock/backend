import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

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

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const isProduction = process.env.NODE_ENV === 'production';

    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : null;

    const exceptionMessage =
      isHttpException && typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as Record<string, unknown>).message
        : undefined;

    const rawMessage = Array.isArray(exceptionMessage)
      ? exceptionMessage.join(', ')
      : typeof exceptionMessage === 'string'
        ? exceptionMessage
        : exception instanceof Error
          ? exception.message
          : 'Internal Server Error';

    const error =
      isHttpException && typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as Record<string, unknown>).error ?? STATUS_NAMES[status] ?? 'Internal Server Error'
        : STATUS_NAMES[status] ?? 'Internal Server Error';

    // Log stack traces for 500+ errors (LoggingInterceptor handles request-level logging)
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const message = isProduction && status >= 500
      ? 'Internal Server Error'
      : rawMessage;

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: request.path,
      timestamp: new Date().toISOString(),
    });
  }
}
