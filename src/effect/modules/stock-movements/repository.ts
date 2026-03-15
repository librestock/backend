import { Context, Effect } from 'effect';
import { Repository } from 'typeorm';
import {
  applyQuerySpecs,
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type QuerySpec,
  type RepositoryPaginatedResult,
} from '../../platform/query-spec.utils';
import { StockMovement } from './entities/stock-movement.entity';
import type { Schema } from 'effect';
import type {
  StockMovementQuerySchema,
} from './stock-movements.schema';
import { TypeOrmDataSource } from '../../platform/typeorm';

type StockMovementQueryDto = Schema.Schema.Type<typeof StockMovementQuerySchema>;

export interface StockMovementsRepository {
  readonly findAllPaginated: (
    query: StockMovementQueryDto,
  ) => Promise<RepositoryPaginatedResult<StockMovement>>;
  readonly findById: (id: string) => Promise<StockMovement | null>;
  readonly findByProductId: (productId: string) => Promise<StockMovement[]>;
  readonly findByLocationId: (locationId: string) => Promise<StockMovement[]>;
  readonly create: (data: Partial<StockMovement>) => Promise<StockMovement>;
}

export const StockMovementsRepository = Context.GenericTag<StockMovementsRepository>(
  '@librestock/effect/StockMovementsRepository',
);

const stockMovementFilterSpec: QuerySpec<StockMovement, StockMovementQueryDto> = (
  queryBuilder,
  query,
) => {
  if (query.product_id) {
    queryBuilder.andWhere('sm.product_id = :productId', {
      productId: query.product_id,
    });
  }

  if (query.location_id) {
    queryBuilder.andWhere(
      '(sm.from_location_id = :locationId OR sm.to_location_id = :locationId)',
      { locationId: query.location_id },
    );
  }

  if (query.reason) {
    queryBuilder.andWhere('sm.reason = :reason', { reason: query.reason });
  }

  if (query.date_from) {
    queryBuilder.andWhere('sm.created_at >= :dateFrom', {
      dateFrom: query.date_from,
    });
  }

  if (query.date_to) {
    queryBuilder.andWhere('sm.created_at <= :dateTo', {
      dateTo: query.date_to,
    });
  }
};

const stockMovementSortSpec: QuerySpec<StockMovement, StockMovementQueryDto> = (
  queryBuilder,
) => {
  queryBuilder.orderBy('sm.created_at', 'DESC');
};

const createStockMovementsRepository = (
  repository: Repository<StockMovement>,
): StockMovementsRepository => ({
  findAllPaginated: async (query) => {
    const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);

    const qb = applyQuerySpecs(
      repository
        .createQueryBuilder('sm')
        .leftJoinAndSelect('sm.product', 'product')
        .leftJoinAndSelect('sm.fromLocation', 'fromLocation')
        .leftJoinAndSelect('sm.toLocation', 'toLocation'),
      query,
      [stockMovementFilterSpec, stockMovementSortSpec],
    );

    const total = await qb.getCount();
    const data = await qb.skip(skip).take(limit).getMany();

    return toRepositoryPaginatedResult(data, total, page, limit);
  },
  findById: (id) =>
    repository
      .createQueryBuilder('sm')
      .leftJoinAndSelect('sm.product', 'product')
      .leftJoinAndSelect('sm.fromLocation', 'fromLocation')
      .leftJoinAndSelect('sm.toLocation', 'toLocation')
      .where('sm.id = :id', { id })
      .getOne(),
  findByProductId: (productId) =>
    repository
      .createQueryBuilder('sm')
      .leftJoinAndSelect('sm.product', 'product')
      .leftJoinAndSelect('sm.fromLocation', 'fromLocation')
      .leftJoinAndSelect('sm.toLocation', 'toLocation')
      .where('sm.product_id = :productId', { productId })
      .orderBy('sm.created_at', 'DESC')
      .getMany(),
  findByLocationId: (locationId) =>
    repository
      .createQueryBuilder('sm')
      .leftJoinAndSelect('sm.product', 'product')
      .leftJoinAndSelect('sm.fromLocation', 'fromLocation')
      .leftJoinAndSelect('sm.toLocation', 'toLocation')
      .where(
        '(sm.from_location_id = :locationId OR sm.to_location_id = :locationId)',
        { locationId },
      )
      .orderBy('sm.created_at', 'DESC')
      .getMany(),
  create: async (data) => {
    const stockMovement = repository.create(data);
    return repository.save(stockMovement);
  },
});

export const makeStockMovementsRepository = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;

  return createStockMovementsRepository(dataSource.getRepository(StockMovement));
});
