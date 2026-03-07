import { Repository, type ObjectLiteral, type SelectQueryBuilder } from 'typeorm';
import {
  applyQuerySpecs,
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type QuerySpec,
  type RepositoryPaginatedResult,
} from '../utils/query-spec.utils';

interface PaginationQuery {
  page?: number;
  limit?: number;
}

export abstract class PaginatedRepository<
  Entity extends ObjectLiteral,
  Query extends PaginationQuery,
> {
  constructor(protected readonly repository: Repository<Entity>) {}

  protected abstract createPaginatedQueryBuilder(): SelectQueryBuilder<Entity>;
  protected abstract getPaginatedQuerySpecs(): readonly QuerySpec<Entity, Query>[];

  protected async runPaginatedQuery(
    query: Query,
  ): Promise<RepositoryPaginatedResult<Entity>> {
    const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);
    const queryBuilder = applyQuerySpecs(
      this.createPaginatedQueryBuilder(),
      query,
      this.getPaginatedQuerySpecs(),
    );

    const total = await queryBuilder.getCount();
    queryBuilder.skip(skip).take(limit);
    const data = await queryBuilder.getMany();

    return toRepositoryPaginatedResult(data, total, page, limit);
  }
}
