import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';

@Injectable()
export class OrderItemRepository {
  constructor(
    @InjectRepository(OrderItem)
    private readonly repository: Repository<OrderItem>,
  ) {}

  async findByOrderId(orderId: string): Promise<OrderItem[]> {
    return this.repository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.product', 'product')
      .where('item.order_id = :orderId', { orderId })
      .getMany();
  }

  async createMany(items: Partial<OrderItem>[]): Promise<OrderItem[]> {
    const entities = this.repository.create(items);
    return this.repository.save(entities);
  }

  async deleteByOrderId(orderId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .where('order_id = :orderId', { orderId })
      .execute();
  }
}
