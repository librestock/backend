import { Context, Effect } from 'effect';
import type { Schema } from 'effect';
import { OrderQuerySchema } from '@librestock/types/orders';
import { Repository } from 'typeorm';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
  type RepositoryPaginatedResult,
} from '../../../common/utils/query-spec.utils';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { Order } from '../../../routes/orders/entities/order.entity';
import { OrderItem } from '../../../routes/orders/entities/order-item.entity';

type OrderQueryDto = Schema.Schema.Type<typeof OrderQuerySchema>;

export interface OrdersRepository {
  readonly findAllPaginated: (
    query: OrderQueryDto,
  ) => Promise<RepositoryPaginatedResult<Order>>;
  readonly findById: (id: string) => Promise<Order | null>;
  readonly create: (data: Partial<Order>) => Promise<Order>;
  readonly update: (id: string, data: Partial<Order>) => Promise<number>;
  readonly delete: (id: string) => Promise<void>;
  readonly getNextOrderNumberSequence: () => Promise<number>;
  readonly existsById: (id: string) => Promise<boolean>;
}

export interface OrderItemsRepository {
  readonly findByOrderId: (orderId: string) => Promise<OrderItem[]>;
  readonly createMany: (items: Partial<OrderItem>[]) => Promise<OrderItem[]>;
  readonly deleteByOrderId: (orderId: string) => Promise<void>;
}

export const OrdersRepository = Context.GenericTag<OrdersRepository>(
  '@librestock/effect/OrdersRepository',
);

export const OrderItemsRepository = Context.GenericTag<OrderItemsRepository>(
  '@librestock/effect/OrderItemsRepository',
);

const createOrdersRepository = (
  repository: Repository<Order>,
): OrdersRepository => ({
  findAllPaginated: async (query) => {
    const { page, limit, skip } = resolvePaginationWindow(query.page, query.limit);
    const qb = repository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.client', 'client')
      .leftJoinAndSelect('order.items', 'items');

    if (query.client_id) {
      qb.andWhere('order.client_id = :clientId', { clientId: query.client_id });
    }

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.date_from) {
      qb.andWhere('order.created_at >= :dateFrom', { dateFrom: query.date_from });
    }

    if (query.date_to) {
      qb.andWhere('order.created_at <= :dateTo', { dateTo: query.date_to });
    }

    if (query.q) {
      qb.andWhere('(order.order_number ILIKE :q OR client.company_name ILIKE :q)', {
        q: `%${query.q}%`,
      });
    }

    qb.orderBy('order.created_at', 'DESC');

    const total = await qb.getCount();
    const data = await qb.skip(skip).take(limit).getMany();

    return toRepositoryPaginatedResult(data, total, page, limit);
  },
  findById: (id) =>
    repository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.client', 'client')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('order.id = :id', { id })
      .getOne(),
  create: async (data) => {
    const order = repository.create(data);
    return repository.save(order);
  },
  update: async (id, data) => {
    const result = await repository
      .createQueryBuilder()
      .update(Order)
      .set(data)
      .where('id = :id', { id })
      .execute();
    return result.affected ?? 0;
  },
  delete: async (id) => {
    await repository.delete(id);
  },
  getNextOrderNumberSequence: async () => {
    const [result] = await repository.query(
      `SELECT nextval('order_number_seq')::bigint AS value`,
    );
    return Number(result.value);
  },
  existsById: async (id) => {
    const count = await repository
      .createQueryBuilder('order')
      .where('order.id = :id', { id })
      .getCount();
    return count > 0;
  },
});

const createOrderItemsRepository = (
  repository: Repository<OrderItem>,
): OrderItemsRepository => ({
  findByOrderId: (orderId) =>
    repository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.product', 'product')
      .where('item.order_id = :orderId', { orderId })
      .getMany(),
  createMany: async (items) => {
    const entities = repository.create(items);
    return repository.save(entities);
  },
  deleteByOrderId: async (orderId) => {
    await repository
      .createQueryBuilder()
      .delete()
      .where('order_id = :orderId', { orderId })
      .execute();
  },
});

export const makeOrdersRepository = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;
  return createOrdersRepository(dataSource.getRepository(Order));
});

export const makeOrderItemsRepository = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;
  return createOrderItemsRepository(dataSource.getRepository(OrderItem));
});
