import { Transactional as TypeOrmTransactional } from 'typeorm-transactional';

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
 * Uses AsyncLocalStorage-backed transaction propagation via `typeorm-transactional`.
 */
export const Transactional = (): MethodDecorator => TypeOrmTransactional();
