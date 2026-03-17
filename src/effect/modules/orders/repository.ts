import { Effect } from 'effect';
import type { Schema } from 'effect';
import { type OrderQuerySchema } from '@librestock/types/orders';
import {
  resolvePaginationWindow,
  toRepositoryPaginatedResult,
} from '../../platform/query-spec.utils';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersInfrastructureError } from './orders.errors';

type OrderQueryDto = Schema.Schema.Type<typeof OrderQuerySchema>;

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new OrdersInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

export class OrdersRepository extends Effect.Service<OrdersRepository>()(
  '@librestock/effect/OrdersRepository',
  {
    effect: Effect.gen(function* () {
      const dataSource = yield* TypeOrmDataSource;
      const repository = dataSource.getRepository(Order);

      const findAllPaginated = (query: OrderQueryDto) =>
        tryAsync('list orders paginated', async () => {
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
        });

      const findById = (id: string) =>
        tryAsync('find order by id', () =>
          repository
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.client', 'client')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('items.product', 'product')
            .where('order.id = :id', { id })
            .getOne(),
        );

      const create = (data: Partial<Order>) =>
        tryAsync('create order', async () => {
          const order = repository.create(data);
          return repository.save(order);
        });

      const update = (id: string, data: Partial<Order>) =>
        tryAsync('update order', async () => {
          const result = await repository
            .createQueryBuilder()
            .update(Order)
            .set(data)
            .where('id = :id', { id })
            .execute();
          return result.affected ?? 0;
        });

      const remove = (id: string) =>
        tryAsync('delete order', () => repository.delete(id));

      const getNextOrderNumberSequence = () =>
        tryAsync('get next order number', async () => {
          const [result] = await repository.query(
            `SELECT nextval('order_number_seq')::bigint AS value`,
          );
          return Number(result.value);
        });

      const existsById = (id: string) =>
        tryAsync('check order existence', async () => {
          const count = await repository
            .createQueryBuilder('order')
            .where('order.id = :id', { id })
            .getCount();
          return count > 0;
        });

      return {
        findAllPaginated,
        findById,
        create,
        update,
        delete: remove,
        getNextOrderNumberSequence,
        existsById,
      };
    }),
  },
) {}

export class OrderItemsRepository extends Effect.Service<OrderItemsRepository>()(
  '@librestock/effect/OrderItemsRepository',
  {
    effect: Effect.gen(function* () {
      const dataSource = yield* TypeOrmDataSource;
      const repository = dataSource.getRepository(OrderItem);

      const findByOrderId = (orderId: string) =>
        tryAsync('find order items by order id', () =>
          repository
            .createQueryBuilder('item')
            .leftJoinAndSelect('item.product', 'product')
            .where('item.order_id = :orderId', { orderId })
            .getMany(),
        );

      const createMany = (items: Partial<OrderItem>[]) =>
        tryAsync('create order items', async () => {
          const entities = repository.create(items);
          return repository.save(entities);
        });

      const deleteByOrderId = (orderId: string) =>
        tryAsync('delete order items by order id', () =>
          repository
            .createQueryBuilder()
            .delete()
            .where('order_id = :orderId', { orderId })
            .execute(),
        );

      return {
        findByOrderId,
        createMany,
        deleteByOrderId,
      };
    }),
  },
) {}
