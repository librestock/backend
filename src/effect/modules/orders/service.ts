import { Context, Effect } from 'effect';
import type { Schema } from 'effect';
import {
  CreateOrderSchema,
  OrderStatus,
  OrderQuerySchema,
  UpdateOrderSchema,
  UpdateOrderStatusSchema,
} from '@librestock/types/orders';
import { toPaginatedResponse } from '../../../common/utils/pagination.utils';
import type {
  OrderResponseDto,
  PaginatedOrdersResponseDto,
} from '../../../routes/orders/dto';
import {
  CannotDeleteNonDraftOrder,
  ClientNotFound,
  InvalidOrderStatusTransition,
  OrderNotFound,
  OrdersInfrastructureError,
} from '../../../routes/orders/orders.errors';
import { OrderUtils } from '../../../routes/orders/orders.utils';
import { getOrderState } from '../../../routes/orders/state/order-state';
import type { Order } from '../../../routes/orders/entities/order.entity';
import { ProductNotFound } from '../../../routes/products/products.errors';
import { ClientsService } from '../clients/service';
import { ProductsService } from '../products/service';
import { OrderItemsRepository, OrdersRepository } from './repository';

type OrderQueryDto = Schema.Schema.Type<typeof OrderQuerySchema>;
type CreateOrderDto = Schema.Schema.Type<typeof CreateOrderSchema>;
type UpdateOrderDto = Schema.Schema.Type<typeof UpdateOrderSchema>;
type UpdateOrderStatusDto = Schema.Schema.Type<typeof UpdateOrderStatusSchema>;

export interface OrdersService {
  readonly findAllPaginated: (
    query: OrderQueryDto,
  ) => Effect.Effect<PaginatedOrdersResponseDto, OrdersInfrastructureError>;
  readonly findOne: (
    id: string,
  ) => Effect.Effect<OrderResponseDto, OrderNotFound | OrdersInfrastructureError>;
  readonly create: (
    dto: CreateOrderDto,
    userId: string,
  ) => Effect.Effect<
    OrderResponseDto,
    ClientNotFound | OrderNotFound | OrdersInfrastructureError | ProductNotFound
  >;
  readonly update: (
    id: string,
    dto: UpdateOrderDto,
  ) => Effect.Effect<OrderResponseDto, OrderNotFound | OrdersInfrastructureError>;
  readonly updateStatus: (
    id: string,
    dto: UpdateOrderStatusDto,
  ) => Effect.Effect<
    OrderResponseDto,
    InvalidOrderStatusTransition | OrderNotFound | OrdersInfrastructureError
  >;
  readonly delete: (
    id: string,
  ) => Effect.Effect<
    void,
    CannotDeleteNonDraftOrder | OrderNotFound | OrdersInfrastructureError
  >;
  readonly existsById: (
    id: string,
  ) => Effect.Effect<boolean, OrdersInfrastructureError>;
}

export const OrdersService = Context.GenericTag<OrdersService>(
  '@librestock/effect/OrdersService',
);

export const makeOrdersService = Effect.gen(function* () {
  const ordersRepository = yield* OrdersRepository;
  const orderItemsRepository = yield* OrderItemsRepository;
  const clientsService = yield* ClientsService;
  const productsService = yield* ProductsService;

  const getOrderOrFail = (
    id: string,
  ): Effect.Effect<Order, OrderNotFound | OrdersInfrastructureError> =>
    Effect.flatMap(
      OrderUtils.tryAsync('load order', () => ordersRepository.findById(id)),
      (order) =>
        order
          ? Effect.succeed(order)
          : Effect.fail(
              new OrderNotFound({
                id,
                message: 'Order not found',
              }),
            ),
    );

  const validateStatusTransition = (
    order: Order,
    nextStatus: OrderStatus,
  ): Effect.Effect<void, InvalidOrderStatusTransition> =>
    Effect.try({
      try: () => {
        const currentState = getOrderState(order.status);
        const targetState = getOrderState(nextStatus);

        currentState.validateTransition(nextStatus);
        targetState.validateEntry(order);
      },
      catch: (error) =>
        new InvalidOrderStatusTransition({
          from: order.status,
          to: nextStatus,
          message:
            error instanceof Error
              ? error.message
              : `Cannot transition from ${order.status} to ${nextStatus}`,
        }),
    });

  const generateOrderNumber = (): Effect.Effect<
    string,
    OrdersInfrastructureError
  > =>
    Effect.map(
      OrderUtils.tryAsync('get the next order number sequence', () =>
        ordersRepository.getNextOrderNumberSequence(),
      ),
      (sequence) =>
        `${OrderUtils.generateOrderPrefix(new Date())}-${String(sequence).padStart(5, '0')}`,
    );

  return {
    findAllPaginated: (query) =>
      Effect.map(
        OrderUtils.tryAsync('list orders', () =>
          ordersRepository.findAllPaginated(query),
        ),
        (result) => toPaginatedResponse(result, OrderUtils.toOrderResponseDto),
      ),
    findOne: (id) =>
      Effect.map(getOrderOrFail(id), OrderUtils.toOrderResponseDto),
    create: (dto, userId) =>
      Effect.gen(function* () {
        const clientExists = yield* OrderUtils.tryAsync(
          'check client existence',
          () => clientsService.existsById(dto.client_id),
        );
        if (!clientExists) {
          return yield* Effect.fail(
            new ClientNotFound({
              clientId: dto.client_id,
              message: 'Client not found',
            }),
          );
        }

        yield* Effect.forEach(dto.items, (item) =>
          Effect.gen(function* () {
            const productExists = yield* OrderUtils.tryAsync(
              'check product existence',
              () => productsService.existsById(item.product_id),
            );
            if (!productExists) {
              return yield* Effect.fail(
                new ProductNotFound({
                  productId: item.product_id,
                  message: `Product ${item.product_id} not found`,
                }),
              );
            }
          }),
        );

        const total_amount = dto.items.reduce(
          (sum, item) => sum + item.quantity * item.unit_price,
          0,
        );

        const order_number = yield* generateOrderNumber();

        const order = yield* OrderUtils.tryAsync('create order', () =>
          ordersRepository.create({
            client_id: dto.client_id,
            delivery_address: dto.delivery_address,
            delivery_deadline: dto.delivery_deadline ?? null,
            yacht_name: dto.yacht_name ?? null,
            special_instructions: dto.special_instructions ?? null,
            total_amount,
            created_by: userId,
            status: OrderStatus.DRAFT,
            order_number,
          }),
        );

        const items = dto.items.map((item) => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price,
          notes: item.notes ?? null,
        }));
        yield* OrderUtils.tryAsync('create order items', () =>
          orderItemsRepository.createMany(items),
        );

        const orderWithRelations = yield* getOrderOrFail(order.id);
        return OrderUtils.toOrderResponseDto(orderWithRelations);
      }),
    update: (id, dto) =>
      Effect.gen(function* () {
        const order = yield* getOrderOrFail(id);

        if (Object.keys(dto).length === 0) {
          return OrderUtils.toOrderResponseDto(order);
        }

        const updateData: Partial<Order> = {};
        if (dto.delivery_address !== undefined) {
          updateData.delivery_address = dto.delivery_address;
        }
        if (dto.delivery_deadline !== undefined) {
          updateData.delivery_deadline = dto.delivery_deadline;
        }
        if (dto.yacht_name !== undefined) {
          updateData.yacht_name = dto.yacht_name;
        }
        if (dto.special_instructions !== undefined) {
          updateData.special_instructions = dto.special_instructions;
        }
        if (dto.assigned_to !== undefined) {
          updateData.assigned_to = dto.assigned_to;
        }

        yield* OrderUtils.tryAsync('update order', () =>
          ordersRepository.update(id, updateData),
        );

        const updated = yield* getOrderOrFail(id);
        return OrderUtils.toOrderResponseDto(updated);
      }),
    updateStatus: (id, dto) =>
      Effect.gen(function* () {
        const order = yield* getOrderOrFail(id);

        yield* validateStatusTransition(order, dto.status);

        const updateData: Partial<Order> = { status: dto.status };
        const timestampField = getOrderState(dto.status).timestampField;
        if (timestampField) {
          updateData[timestampField] = new Date() as never;
        }

        yield* OrderUtils.tryAsync('update order status', () =>
          ordersRepository.update(id, updateData),
        );

        const updated = yield* getOrderOrFail(id);
        return OrderUtils.toOrderResponseDto(updated);
      }),
    delete: (id) =>
      Effect.gen(function* () {
        const order = yield* getOrderOrFail(id);
        if (order.status !== OrderStatus.DRAFT) {
          return yield* Effect.fail(
            new CannotDeleteNonDraftOrder({
              orderId: id,
              status: order.status,
              message: 'Only draft orders can be deleted',
            }),
          );
        }

        yield* OrderUtils.tryAsync('delete order items', () =>
          orderItemsRepository.deleteByOrderId(id),
        );
        yield* OrderUtils.tryAsync('delete order', () =>
          ordersRepository.delete(id),
        );
      }),
    existsById: (id) =>
      OrderUtils.tryAsync('check if an order exists', () =>
        ordersRepository.existsById(id),
      ),
  } satisfies OrdersService;
});
