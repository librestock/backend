import { Effect } from 'effect';
import type { Schema } from 'effect';
import {
  applyQuerySpecs,
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type QuerySpec,
} from '../../platform/query-spec.utils';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { StockMovement } from './entities/stock-movement.entity';
import type {
  StockMovementQuerySchema,
} from './stock-movements.schema';
import { StockMovementsInfrastructureError } from './stock-movements.errors';

type StockMovementQueryDto = Schema.Schema.Type<typeof StockMovementQuerySchema>;

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new StockMovementsInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

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

export class StockMovementsRepository extends Effect.Service<StockMovementsRepository>()(
  '@librestock/effect/StockMovementsRepository',
  {
    effect: Effect.gen(function* () {
      const dataSource = yield* TypeOrmDataSource;
      const repository = dataSource.getRepository(StockMovement);

      const findAllPaginated = (query: StockMovementQueryDto) =>
        tryAsync('list stock movements paginated', async () => {
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
        });

      const findById = (id: string) =>
        tryAsync('find stock movement by id', () =>
          repository
            .createQueryBuilder('sm')
            .leftJoinAndSelect('sm.product', 'product')
            .leftJoinAndSelect('sm.fromLocation', 'fromLocation')
            .leftJoinAndSelect('sm.toLocation', 'toLocation')
            .where('sm.id = :id', { id })
            .getOne(),
        );

      const findByProductId = (productId: string) =>
        tryAsync('find stock movements by product', () =>
          repository
            .createQueryBuilder('sm')
            .leftJoinAndSelect('sm.product', 'product')
            .leftJoinAndSelect('sm.fromLocation', 'fromLocation')
            .leftJoinAndSelect('sm.toLocation', 'toLocation')
            .where('sm.product_id = :productId', { productId })
            .orderBy('sm.created_at', 'DESC')
            .getMany(),
        );

      const findByLocationId = (locationId: string) =>
        tryAsync('find stock movements by location', () =>
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
        );

      const create = (data: Partial<StockMovement>) =>
        tryAsync('create stock movement', async () => {
          const stockMovement = repository.create(data);
          return repository.save(stockMovement);
        });

      return {
        findAllPaginated,
        findById,
        findByProductId,
        findByLocationId,
        create,
      };
    }),
  },
) {}
