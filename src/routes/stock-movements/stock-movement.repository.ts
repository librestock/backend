import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  applyQuerySpecs,
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type QuerySpec,
  type RepositoryPaginatedResult,
} from '../../common/utils/query-spec.utils';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMovementQueryDto } from './dto';

export type PaginatedResult<T> = RepositoryPaginatedResult<T>;

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
      '(sm.from_location_id = :locId OR sm.to_location_id = :locId)',
      { locId: query.location_id },
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

@Injectable()
export class StockMovementRepository {
  constructor(
    @InjectRepository(StockMovement)
    private readonly repository: Repository<StockMovement>,
  ) {}

  async findAllPaginated(
    query: StockMovementQueryDto,
  ): Promise<PaginatedResult<StockMovement>> {
    const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);

    const qb = applyQuerySpecs(
      this.repository
        .createQueryBuilder('sm')
        .leftJoinAndSelect('sm.product', 'product')
        .leftJoinAndSelect('sm.fromLocation', 'fromLocation')
        .leftJoinAndSelect('sm.toLocation', 'toLocation'),
      query,
      [stockMovementFilterSpec, stockMovementSortSpec],
    );

    const total = await qb.getCount();
    qb.skip(skip).take(limit);

    const data = await qb.getMany();

    return toRepositoryPaginatedResult(data, total, page, limit);
  }

  async findById(id: string): Promise<StockMovement | null> {
    return this.repository
      .createQueryBuilder('sm')
      .leftJoinAndSelect('sm.product', 'product')
      .leftJoinAndSelect('sm.fromLocation', 'fromLocation')
      .leftJoinAndSelect('sm.toLocation', 'toLocation')
      .where('sm.id = :id', { id })
      .getOne();
  }

  async findByProductId(productId: string): Promise<StockMovement[]> {
    return this.repository
      .createQueryBuilder('sm')
      .leftJoinAndSelect('sm.product', 'product')
      .leftJoinAndSelect('sm.fromLocation', 'fromLocation')
      .leftJoinAndSelect('sm.toLocation', 'toLocation')
      .where('sm.product_id = :productId', { productId })
      .orderBy('sm.created_at', 'DESC')
      .getMany();
  }

  async findByLocationId(locationId: string): Promise<StockMovement[]> {
    return this.repository
      .createQueryBuilder('sm')
      .leftJoinAndSelect('sm.product', 'product')
      .leftJoinAndSelect('sm.fromLocation', 'fromLocation')
      .leftJoinAndSelect('sm.toLocation', 'toLocation')
      .where(
        '(sm.from_location_id = :locationId OR sm.to_location_id = :locationId)',
        { locationId },
      )
      .orderBy('sm.created_at', 'DESC')
      .getMany();
  }

  async create(data: Partial<StockMovement>): Promise<StockMovement> {
    const movement = this.repository.create(data);
    return this.repository.save(movement);
  }
}
