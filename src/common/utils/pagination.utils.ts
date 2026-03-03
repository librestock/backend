export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export function toPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const total_pages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    total_pages,
    has_next: page < total_pages,
    has_previous: page > 1,
  };
}

export function toPaginatedResponse<T, R>(
  result: PaginatedResult<T>,
  mapItem: (item: T) => R,
): { data: R[]; meta: PaginationMeta } {
  return {
    data: result.data.map(mapItem),
    meta: toPaginationMeta(result.total, result.page, result.limit),
  };
}
