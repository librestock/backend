import { asc, desc, type Column } from 'drizzle-orm';

export function buildOrderBy<T extends string>(
  columnMap: Record<T, Column>,
  sortBy: T,
  sortOrder: 'ASC' | 'DESC',
) {
  const column = columnMap[sortBy];
  return sortOrder === 'ASC' ? asc(column) : desc(column);
}
