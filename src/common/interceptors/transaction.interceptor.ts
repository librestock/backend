import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, switchMap } from 'rxjs';
import { DataSource } from 'typeorm';
import { TRANSACTIONAL_KEY } from '../decorators/transactional.decorator';

/**
 * Interceptor that wraps methods marked with @Transactional in a database transaction
 *
 * This ensures atomicity for critical operations:
 * - If the method succeeds, changes are committed
 * - If the method throws an error, all changes are rolled back
 */
@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TransactionInterceptor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Check if the method is decorated with @Transactional
    const isTransactional = this.reflector.get<boolean>(
      TRANSACTIONAL_KEY,
      context.getHandler(),
    );

    // If not transactional, proceed normally
    if (!isTransactional) {
      return next.handle();
    }

    // Get method and class names for logging
    const methodName = context.getHandler().name;
    const className = context.getClass().name;

    // Wrap the method execution in a transaction
    return from(
      this.dataSource.transaction(async () => {
        this.logger.debug(
          `Starting transaction for ${className}.${methodName}`,
        );

        try {
          // Execute the handler and convert to Promise
          const result = await next.handle().toPromise();

          this.logger.debug(
            `Transaction committed for ${className}.${methodName}`,
          );

          return result;
        } catch (error: any) {
          this.logger.warn(
            `Transaction rolled back for ${className}.${methodName}: ${error?.message ?? 'Unknown error'}`,
          );
          throw error;
        }
      }),
    ).pipe(switchMap((result) => from(Promise.resolve(result))));
  }
}
