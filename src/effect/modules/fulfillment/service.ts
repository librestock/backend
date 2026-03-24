import { Effect } from 'effect';
import type {
  OrderFulfillmentView,
  PackInput,
  PickInput,
} from '@librestock/types/fulfillment';
import { OrderStatus } from '@librestock/types/orders';
import type { orders, orderItems } from '../../platform/db/schema';
import { InventoryRepository } from '../inventory/repository';
import { OrderItemsRepository, OrdersRepository } from '../orders/repository';
import { StockMovementsRepository } from '../stock-movements/repository';
import {
  FulfillmentInfrastructureError,
  FulfillmentInvalidTransition,
  FulfillmentNotImplemented,
  FulfillmentOrderNotFound,
} from './errors';

type OrderItemRow = typeof orderItems.$inferSelect;
type OrderItem = OrderItemRow & {
  product?: { id: string; name: string; sku: string } | null;
};

type OrderRow = typeof orders.$inferSelect;
type Order = OrderRow & {
  client?: { company_name: string } | null;
  items?: OrderItem[];
};

export class FulfillmentService extends Effect.Service<FulfillmentService>()(
  '@librestock/effect/FulfillmentService',
  {
    effect: Effect.gen(function* () {
      const ordersRepository = yield* OrdersRepository;
      const orderItemsRepository = yield* OrderItemsRepository;
      const inventoryRepository = yield* InventoryRepository;
      const stockMovementsRepository = yield* StockMovementsRepository;

      const wrapInfrastructureError = (action: string) =>
        (cause: unknown) =>
          new FulfillmentInfrastructureError({
            action,
            cause,
            message: `Fulfillment failed to ${action}`,
          });

      const loadOrderOrFail = (
        orderId: string,
      ): Effect.Effect<
        Order,
        FulfillmentOrderNotFound | FulfillmentInfrastructureError
      > =>
        Effect.flatMap(
          Effect.mapError(
            ordersRepository.findById(orderId),
            wrapInfrastructureError('load order'),
          ),
          (order) =>
            order
              ? Effect.succeed(order)
              : Effect.fail(
                  new FulfillmentOrderNotFound({
                    orderId,
                    message: 'Order not found',
                  }),
                ),
        );

      const toView = (order: Order): OrderFulfillmentView => ({
        orderId: order.id,
        status: order.status,
        confirmedAt: order.confirmed_at,
        shippedAt: order.shipped_at,
        deliveredAt: order.delivered_at,
        items: (order.items ?? []).map((item) => ({
          orderItemId: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          quantityPicked: item.quantity_picked,
          quantityPacked: item.quantity_packed,
        })),
      });

      const confirm = (orderId: string, actorId: string) =>
        Effect.gen(function* () {
          const order = yield* loadOrderOrFail(orderId);

          if (order.status !== OrderStatus.DRAFT) {
            return yield* Effect.fail(
              new FulfillmentInvalidTransition({
                orderId,
                from: order.status,
                to: OrderStatus.CONFIRMED,
                message: 'Only draft orders can be confirmed',
              }),
            );
          }

          yield* ordersRepository.update(orderId, {
            status: OrderStatus.CONFIRMED,
            confirmed_at: new Date(),
            assigned_to: actorId,
          }).pipe(
            Effect.mapError(wrapInfrastructureError('confirm order')),
          );

          const updated = yield* loadOrderOrFail(orderId);
          return toView(updated);
        });

      const pick = (input: {
        readonly orderId: string;
        readonly actorId: string;
        readonly picks: ReadonlyArray<PickInput>;
      }) =>
        Effect.gen(function* () {
          yield* loadOrderOrFail(input.orderId);

          // Keep the collaborators referenced so this module can deepen around them
          // without changing the public API again.
          void input.actorId;
          void input.picks;
          void orderItemsRepository;
          void inventoryRepository;
          void stockMovementsRepository;

          return yield* Effect.fail(
            new FulfillmentNotImplemented({
              operation: 'pick',
              message:
                'Picking requires a fulfillment store/transaction boundary that updates order items, inventory, and stock movements together',
            }),
          );
        });

      const pack = (input: {
        readonly orderId: string;
        readonly actorId: string;
        readonly packs: ReadonlyArray<PackInput>;
      }) =>
        Effect.gen(function* () {
          yield* loadOrderOrFail(input.orderId);

          void input.actorId;
          void input.packs;
          void orderItemsRepository;

          return yield* Effect.fail(
            new FulfillmentNotImplemented({
              operation: 'pack',
              message:
                'Packing requires order-item progress writes and workflow validation inside one fulfillment boundary',
            }),
          );
        });

      const ship = (orderId: string, actorId: string) =>
        Effect.gen(function* () {
          yield* loadOrderOrFail(orderId);

          void actorId;
          void inventoryRepository;
          void stockMovementsRepository;

          return yield* Effect.fail(
            new FulfillmentNotImplemented({
              operation: 'ship',
              message:
                'Shipping requires atomic inventory decrement, stock movement creation, and status transition logic',
            }),
          );
        });

      return {
        confirm,
        pick,
        pack,
        ship,
      };
    }),
    dependencies: [
      OrdersRepository.Default,
      OrderItemsRepository.Default,
      InventoryRepository.Default,
      StockMovementsRepository.Default,
    ],
  },
) {}
