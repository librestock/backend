import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Effect } from 'effect';
import {
  OrderStatus,
  type CreateOrder,
  type OrderQuery,
  type UpdateOrder,
  type UpdateOrderStatus,
} from '@librestock/types';
import { toPaginatedResponse } from '../../common/utils/pagination.utils';
import { ClientsService } from '../clients/clients.service';
import { ProductsService } from '../products/products.service';
import { Order } from './entities/order.entity';
import {
  ORDER_STATUS_CHANGED,
  OrderStatusChangedEvent,
} from './events/order-status-changed.event';
import { OrderItemRepository } from './order-items.repository';
import { OrderResponseDto, PaginatedOrdersResponseDto } from './dto';
import {
  CannotDeleteNonDraftOrder,
  ClientNotFound,
  InvalidOrderStatusTransition,
  OrderNotFound,
  OrdersInfrastructureError,
  ProductNotFound,
} from './orders.errors';
import { OrderRepository } from './orders.repository';
import { getOrderState } from './state/order-state';
import { OrderUtils } from './orders.utils';

@Injectable()
export class OrdersService {
  public constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderItemRepository: OrderItemRepository,
    private readonly clientsService: ClientsService,
    private readonly productsService: ProductsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  public findAllPaginated(
    query: OrderQuery,
  ): Effect.Effect<PaginatedOrdersResponseDto, OrdersInfrastructureError> {
    return Effect.map(
      OrderUtils.tryAsync('list orders', () =>
        this.orderRepository.findAllPaginated(query),
      ),
      (result) => toPaginatedResponse(result, OrderUtils.toOrderResponseDto),
    );
  }

  public findOne(
    id: string,
  ): Effect.Effect<
    OrderResponseDto,
    OrderNotFound | OrdersInfrastructureError
  > {
    return Effect.map(this.getOrderOrFail(id), OrderUtils.toOrderResponseDto);
  }

  public create(
    dto: CreateOrder,
    userId: string,
  ): Effect.Effect<
    OrderResponseDto,
    ClientNotFound | OrderNotFound | OrdersInfrastructureError | ProductNotFound
  > {
    return Effect.gen(this, function* () {
      const clientExists = yield* OrderUtils.tryAsync(
        'check client existence',
        () => this.clientsService.existsById(dto.client_id),
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
        Effect.gen(this, function* () {
          const productExists = yield* OrderUtils.tryAsync(
            'check product existence',
            () => this.productsService.existsById(item.product_id),
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
        (sum: number, item: CreateOrder['items'][number]) =>
          sum + item.quantity * item.unit_price,
        0,
      );

      const order_number = yield* this.generateOrderNumber();
      const order = yield* OrderUtils.tryAsync('create order', () =>
        this.orderRepository.create({
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

      const items = dto.items.map((item: CreateOrder['items'][number]) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
        notes: item.notes ?? null,
      }));
      yield* OrderUtils.tryAsync('create order items', () =>
        this.orderItemRepository.createMany(items),
      );

      const orderWithRelations = yield* this.getOrderOrFail(order.id);
      return OrderUtils.toOrderResponseDto(orderWithRelations);
    });
  }

  public update(
    id: string,
    dto: UpdateOrder,
  ): Effect.Effect<
    OrderResponseDto,
    OrderNotFound | OrdersInfrastructureError
  > {
    return Effect.gen(this, function* () {
      const order = yield* this.getOrderOrFail(id);

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
        this.orderRepository.update(id, updateData),
      );

      const updated = yield* this.getOrderOrFail(id);
      return OrderUtils.toOrderResponseDto(updated);
    });
  }

  public updateStatus(
    id: string,
    dto: UpdateOrderStatus,
  ): Effect.Effect<
    OrderResponseDto,
    InvalidOrderStatusTransition | OrderNotFound | OrdersInfrastructureError
  > {
    return Effect.gen(this, function* () {
      const order = yield* this.getOrderOrFail(id);

      yield* this.validateStatusTransition(order, dto.status);

      yield* OrderUtils.tryAsync('update order status', () =>
        this.orderRepository.update(id, { status: dto.status }),
      );

      yield* OrderUtils.tryAsync('emit order status change event', async () => {
        await this.eventEmitter.emitAsync(
          ORDER_STATUS_CHANGED,
          new OrderStatusChangedEvent(
            id,
            order.status,
            dto.status,
            order,
            new Date(),
          ),
        );
      });

      const updated = yield* this.getOrderOrFail(id);
      return OrderUtils.toOrderResponseDto(updated);
    });
  }

  public delete(
    id: string,
  ): Effect.Effect<
    void,
    CannotDeleteNonDraftOrder | OrderNotFound | OrdersInfrastructureError
  > {
    return Effect.gen(this, function* () {
      const order = yield* this.getOrderOrFail(id);
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
        this.orderItemRepository.deleteByOrderId(id),
      );
      yield* OrderUtils.tryAsync('delete order', () =>
        this.orderRepository.delete(id),
      );
    });
  }

  public existsById(
    id: string,
  ): Effect.Effect<boolean, OrdersInfrastructureError> {
    return OrderUtils.tryAsync('check if an order exists', () =>
      this.orderRepository.existsById(id),
    );
  }

  private getOrderOrFail(
    id: string,
  ): Effect.Effect<Order, OrderNotFound | OrdersInfrastructureError> {
    return Effect.flatMap(
      OrderUtils.tryAsync('load order', () =>
        this.orderRepository.findById(id),
      ),
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
  }

  public generateOrderNumber(): Effect.Effect<
    string,
    OrdersInfrastructureError
  > {
    const prefix = OrderUtils.generateOrderPrefix(new Date());

    return Effect.map(
      OrderUtils.tryAsync('get the next order number sequence', () =>
        this.orderRepository.getNextOrderNumberSequence(),
      ),
      (sequence) => `${prefix}-${String(sequence).padStart(5, '0')}`,
    );
  }

  private validateStatusTransition(
    order: Order,
    nextStatus: OrderStatus,
  ): Effect.Effect<void, InvalidOrderStatusTransition> {
    return Effect.try({
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
  }
}
