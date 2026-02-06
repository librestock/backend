import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderQueryDto } from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

@Injectable()
export class OrderRepository {
  constructor(
    @InjectRepository(Order)
    private readonly repository: Repository<Order>,
  ) {}

  async findAllPaginated(
    query: OrderQueryDto,
  ): Promise<PaginatedResult<Order>> {
    const { page = 1, limit = 20, q, client_id, status, date_from, date_to } = query;
    const skip = (page - 1) * limit;

    const qb = this.repository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.client', 'client')
      .leftJoinAndSelect('order.items', 'items');

    if (client_id) {
      qb.andWhere('order.client_id = :clientId', { clientId: client_id });
    }

    if (status) {
      qb.andWhere('order.status = :status', { status });
    }

    if (date_from) {
      qb.andWhere('order.created_at >= :dateFrom', { dateFrom: date_from });
    }

    if (date_to) {
      qb.andWhere('order.created_at <= :dateTo', { dateTo: date_to });
    }

    if (q) {
      qb.andWhere(
        '(order.order_number ILIKE :q OR client.company_name ILIKE :q)',
        { q: `%${q}%` },
      );
    }

    qb.orderBy('order.created_at', 'DESC');

    const total = await qb.getCount();

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

  async findById(id: string): Promise<Order | null> {
    return this.repository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.client', 'client')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('order.id = :id', { id })
      .getOne();
  }

  async create(data: Partial<Order>): Promise<Order> {
    const order = this.repository.create(data);
    return this.repository.save(order);
  }

  async update(id: string, data: Partial<Order>): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Order)
      .set(data)
      .where('id = :id', { id })
      .execute();
    return result.affected ?? 0;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async countByPrefix(prefix: string): Promise<number> {
    return this.repository
      .createQueryBuilder('order')
      .where('order.order_number LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('order')
      .where('order.id = :id', { id })
      .getCount();
    return count > 0;
  }
}
