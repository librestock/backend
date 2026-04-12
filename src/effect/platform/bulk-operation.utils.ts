export interface BulkOperationResult<T = string> {
  success_count: number;
  failure_count: number;
  succeeded: T[];
  failures: { id?: string; sku?: string; error: string }[];
}

export interface BulkResultBuilder<T = string> {
  addSuccess(id: T): void;
  addFailure(error: string, identifier?: { id?: string; sku?: string }): void;
  addNotFoundFailures(ids: string[], entityName?: string): void;
  build(): BulkOperationResult<T>;
  /** Build with overrides for cases where counts/succeeded come from an external source (e.g. batch UPDATE returning affected rows). */
  buildWith(overrides: Partial<BulkOperationResult<T>>): BulkOperationResult<T>;
}

export function createBulkResultBuilder<T = string>(): BulkResultBuilder<T> {
  const succeeded: T[] = [];
  const failures: { id?: string; sku?: string; error: string }[] = [];

  return {
    addSuccess(id: T) {
      succeeded.push(id);
    },
    addFailure(error: string, identifier?: { id?: string; sku?: string }) {
      failures.push({
        ...(identifier?.id && { id: identifier.id }),
        ...(identifier?.sku && { sku: identifier.sku }),
        error,
      });
    },
    addNotFoundFailures(ids: string[], entityName = 'Entity') {
      for (const id of ids) {
        failures.push({ id, error: `${entityName} not found` });
      }
    },
    build(): BulkOperationResult<T> {
      return {
        success_count: succeeded.length,
        failure_count: failures.length,
        succeeded,
        failures,
      };
    },
    buildWith(overrides: Partial<BulkOperationResult<T>>): BulkOperationResult<T> {
      return {
        success_count: succeeded.length,
        failure_count: failures.length,
        succeeded,
        failures,
        ...overrides,
      };
    },
  };
}

/**
 * Finds duplicate values in an array
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
