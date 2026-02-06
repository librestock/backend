import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';

/**
 * Custom exception filter for throttler errors
 * Provides user-friendly 429 Too Many Requests responses
 */
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(_exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status = HttpStatus.TOO_MANY_REQUESTS;

    response.status(status).json({
      statusCode: status,
      error: 'Too Many Requests',
      message:
        'Rate limit exceeded. Please slow down your requests and try again later.',
      path: request.url,
      timestamp: new Date().toISOString(),
      // Optionally include retry-after header info
      // Note: @nestjs/throttler doesn't provide this by default
      hint: 'Consider implementing exponential backoff or waiting before retrying.',
    });
  }
}
