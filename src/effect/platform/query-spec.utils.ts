import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export type QuerySpec<Entity extends ObjectLiteral, Query> = (
  queryBuilder: SelectQueryBuilder<Entity>,
  query: Query,
) => void;

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

export function applyQuerySpecs<Entity extends ObjectLiteral, Query>(
  queryBuilder: SelectQueryBuilder<Entity>,
  query: Query,
  specs: readonly QuerySpec<Entity, Query>[],
): SelectQueryBuilder<Entity> {
  for (const spec of specs) {
    spec(queryBuilder, query);
  }

  return queryBuilder;
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
