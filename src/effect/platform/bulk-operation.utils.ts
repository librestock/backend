/**
 * Utility functions for bulk operations across services
 */

export interface BulkOperationResult<T = string> {
  success_count: number;
  failure_count: number;
  succeeded: T[];
  failures: { id?: string; sku?: string; error: string }[];
}

/**
 * Creates an empty bulk operation result object
 */
export function createEmptyBulkResult<T = string>(): BulkOperationResult<T> {
  return {
    success_count: 0,
    failure_count: 0,
    succeeded: [],
    failures: [],
  };
}

/**
 * Adds a success entry to the bulk operation result
 */
export function addBulkSuccess<T = string>(
  result: BulkOperationResult<T>,
  id: T,
): void {
  result.success_count++;
  result.succeeded.push(id);
}

/**
 * Adds a failure entry to the bulk operation result
 */
export function addBulkFailure(
  result: BulkOperationResult,
  error: string,
  identifier?: { id?: string; sku?: string },
): void {
  result.failure_count++;
  result.failures.push({
    ...(identifier?.id && { id: identifier.id }),
    ...(identifier?.sku && { sku: identifier.sku }),
    error,
  });
}

/**
 * Finds duplicate values in an array
 * @returns Array of values that appear more than once
 */
export function findDuplicates<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const duplicates = new Set<T>();

  for (const item of arr) {
    if (seen.has(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  }

  return Array.from(duplicates);
}

/**
 * Partitions an array of IDs into existing and non-existing based on a Set of existing IDs
 */
export function partitionByExistence<T>(
  ids: T[],
  existingIds: Set<T>,
): { existing: T[]; notFound: T[] } {
  const existing: T[] = [];
  const notFound: T[] = [];

  for (const id of ids) {
    if (existingIds.has(id)) {
      existing.push(id);
    } else {
      notFound.push(id);
    }
  }

  return { existing, notFound };
}

/**
 * Updates bulk result with not found failures
 */
export function addNotFoundFailures(
  result: BulkOperationResult,
  notFoundIds: string[],
  entityName = 'Entity',
): void {
  for (const id of notFoundIds) {
    addBulkFailure(result, `${entityName} not found`, { id });
  }
}
