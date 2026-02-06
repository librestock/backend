import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for transactional decorator
 */
export const TRANSACTIONAL_KEY = 'transactional';

/**
 * Decorator to mark methods that should run within a database transaction
 *
 * Usage:
 * ```typescript
 * @Transactional()
 * async bulkCreate(dto: BulkDto) {
 *   // This method will run within a transaction
 *   // If any operation fails, all changes will be rolled back
 * }
 * ```
 *
 * The transaction interceptor will automatically wrap the method execution
 * in a TypeORM transaction using the DataSource's transaction method.
 */
export const Transactional = () => SetMetadata(TRANSACTIONAL_KEY, true);
