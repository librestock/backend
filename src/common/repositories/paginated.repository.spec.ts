import type { Repository, SelectQueryBuilder } from 'typeorm';
import { PaginatedRepository } from './paginated.repository';
import type { QuerySpec } from '../utils/query-spec.utils';

interface TestEntity {
  id: string;
}

interface TestQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: 'ASC' | 'DESC';
}

class TestPaginatedRepository extends PaginatedRepository<TestEntity, TestQuery> {
  constructor(
    private readonly queryBuilder: SelectQueryBuilder<TestEntity>,
    specs: readonly QuerySpec<TestEntity, TestQuery>[],
  ) {
    super({} as Repository<TestEntity>);
    this.specs = specs;
  }

  private readonly specs: readonly QuerySpec<TestEntity, TestQuery>[];

  protected createPaginatedQueryBuilder(): SelectQueryBuilder<TestEntity> {
    return this.queryBuilder;
  }

  protected getPaginatedQuerySpecs(): readonly QuerySpec<TestEntity, TestQuery>[] {
    return this.specs;
  }

  async query(query: TestQuery) {
    return this.runPaginatedQuery(query);
  }
}

function createQueryBuilderMock(
  data: TestEntity[],
  total: number,
): jest.Mocked<Partial<SelectQueryBuilder<TestEntity>>> {
  const mock: jest.Mocked<Partial<SelectQueryBuilder<TestEntity>>> = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getCount: jest.fn().mockResolvedValue(total),
    getMany: jest.fn().mockResolvedValue(data),
  };

  mock.where.mockReturnValue(mock as SelectQueryBuilder<TestEntity>);
  mock.andWhere.mockReturnValue(mock as SelectQueryBuilder<TestEntity>);
  mock.orderBy.mockReturnValue(mock as SelectQueryBuilder<TestEntity>);
  mock.skip.mockReturnValue(mock as SelectQueryBuilder<TestEntity>);
  mock.take.mockReturnValue(mock as SelectQueryBuilder<TestEntity>);

  return mock;
}

describe('PaginatedRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies query specs and returns paginated result', async () => {
    const queryBuilder = createQueryBuilderMock([{ id: '1' }], 25);
    const filterSpec: QuerySpec<TestEntity, TestQuery> = (qb, query) => {
      if (query.search) {
        qb.where('entity.name ILIKE :search', { search: `%${query.search}%` });
      }
    };
    const sortSpec: QuerySpec<TestEntity, TestQuery> = (qb, query) => {
      qb.orderBy('entity.name', query.sort ?? 'ASC');
    };

    const repository = new TestPaginatedRepository(
      queryBuilder as SelectQueryBuilder<TestEntity>,
      [filterSpec, sortSpec],
    );

    const result = await repository.query({
      page: 2,
      limit: 10,
      search: 'milk',
      sort: 'DESC',
    });

    expect(queryBuilder.where).toHaveBeenCalledWith('entity.name ILIKE :search', {
      search: '%milk%',
    });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('entity.name', 'DESC');
    expect(queryBuilder.skip).toHaveBeenCalledWith(10);
    expect(queryBuilder.take).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      data: [{ id: '1' }],
      total: 25,
      page: 2,
      limit: 10,
      total_pages: 3,
    });
  });

  it('uses default pagination when page and limit are not provided', async () => {
    const queryBuilder = createQueryBuilderMock([], 0);
    const repository = new TestPaginatedRepository(
      queryBuilder as SelectQueryBuilder<TestEntity>,
      [],
    );

    const result = await repository.query({});

    expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    expect(queryBuilder.take).toHaveBeenCalledWith(20);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.total_pages).toBe(0);
  });
});
