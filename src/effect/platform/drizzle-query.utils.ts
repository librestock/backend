import { type SQL, and } from 'drizzle-orm';

export interface PaginationWindow {
  page: number;
  limit: number;
  skip: number;
}

export interface RepositoryPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export function resolvePaginationWindow(
  page: number | undefined,
  limit: number | undefined,
  defaultPage = 1,
  defaultLimit = 20,
): PaginationWindow {
  const resolvedPage = page ?? defaultPage;
  const resolvedLimit = limit ?? defaultLimit;

  return {
    page: resolvedPage,
    limit: resolvedLimit,
    skip: (resolvedPage - 1) * resolvedLimit,
  };
}

export function toRepositoryPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): RepositoryPaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
}

export function buildWhereClause(conditions: (SQL | undefined)[]): SQL | undefined {
  const filtered = conditions.filter((c): c is SQL => c !== undefined);
  if (filtered.length === 0) return undefined;
  return and(...filtered);
}
