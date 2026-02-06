import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMovementQueryDto } from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

@Injectable()
export class StockMovementRepository {
  constructor(
    @InjectRepository(StockMovement)
    private readonly repository: Repository<StockMovement>,
  ) {}

  async findAllPaginated(
    query: StockMovementQueryDto,
  ): Promise<PaginatedResult<StockMovement>> {
    const { page = 1, limit = 20 } = query;

    const qb = this.repository
      .createQueryBuilder('sm')
      .leftJoinAndSelect('sm.product', 'product')
      .leftJoinAndSelect('sm.fromLocation', 'fromLocation')
      .leftJoinAndSelect('sm.toLocation', 'toLocation');

    if (query.product_id) {
      qb.andWhere('sm.product_id = :productId', {
        productId: query.product_id,
      });
    }

    if (query.location_id) {
      qb.andWhere(
        '(sm.from_location_id = :locId OR sm.to_location_id = :locId)',
        { locId: query.location_id },
      );
    }

    if (query.reason) {
      qb.andWhere('sm.reason = :reason', { reason: query.reason });
    }

    if (query.date_from) {
      qb.andWhere('sm.created_at >= :dateFrom', { dateFrom: query.date_from });
    }

    if (query.date_to) {
      qb.andWhere('sm.created_at <= :dateTo', { dateTo: query.date_to });
    }

    qb.orderBy('sm.created_at', 'DESC');

    const total = await qb.getCount();
    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
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
