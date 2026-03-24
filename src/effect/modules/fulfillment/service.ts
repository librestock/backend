import { Effect } from 'effect';
import type {
  OrderFulfillmentView,
  PackInput,
  PickInput,
} from '@librestock/types/fulfillment';
import { OrderStatus } from '@librestock/types/orders';
import { StockMovementReason } from '@librestock/types/stock-movements';
import type { orders, orderItems } from '../../platform/db/schema';
import { InventoryRepository } from '../inventory/repository';
import { OrderItemsRepository, OrdersRepository } from '../orders/repository';
import { StockMovementsRepository } from '../stock-movements/repository';
import {
  FulfillmentInfrastructureError,
  FulfillmentInvalidTransition,
  FulfillmentNotImplemented,
  FulfillmentOrderNotFound,
  FulfillmentPickFailed,
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

      const wrapInfrastructureError = (action: string) => (cause: unknown) =>
        new FulfillmentInfrastructureError({
          action,
          cause,
          messageKey: 'fulfillment.infrastructureFailed',
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
                    messageKey: 'fulfillment.orderNotFound',
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
                messageKey: 'fulfillment.onlyDraftCanConfirm',
              }),
            );
          }

          yield* ordersRepository
            .update(orderId, {
              status: OrderStatus.CONFIRMED,
              confirmed_at: new Date(),
              assigned_to: actorId,
            })
            .pipe(Effect.mapError(wrapInfrastructureError('confirm order')));

          const updated = yield* loadOrderOrFail(orderId);
          return toView(updated);
        });

      const PICKABLE_STATUSES: readonly OrderStatus[] = [
        OrderStatus.CONFIRMED,
        OrderStatus.PICKING,
      ];

      const pick = (input: {
        readonly orderId: string;
        readonly actorId: string;
        readonly picks: ReadonlyArray<PickInput>;
      }) =>
        Effect.gen(function* () {
          const order = yield* loadOrderOrFail(input.orderId);

          if (!PICKABLE_STATUSES.includes(order.status)) {
            return yield* Effect.fail(
              new FulfillmentInvalidTransition({
                orderId: input.orderId,
                from: order.status,
                to: OrderStatus.PICKING,
                messageKey: 'fulfillment.notPickable',
              }),
            );
          }

          // Transition to PICKING on the first pick
          if (order.status === OrderStatus.CONFIRMED) {
            yield* ordersRepository
              .update(input.orderId, { status: OrderStatus.PICKING })
              .pipe(
                Effect.mapError(
                  wrapInfrastructureError('transition to picking'),
                ),
              );
          }

          // Build a lookup of order items for product_id resolution
          const itemIds = input.picks.map((p) => p.orderItemId);
          const items = yield* orderItemsRepository
            .findByIds(itemIds)
            .pipe(Effect.mapError(wrapInfrastructureError('load order items')));
          const itemMap = new Map((items ?? []).map((i) => [i.id, i]));

          for (const p of input.picks) {
            const item = itemMap.get(p.orderItemId);
            if (!item) {
              return yield* Effect.fail(
                new FulfillmentPickFailed({
                  orderItemId: p.orderItemId,
                  messageKey: 'fulfillment.orderItemNotFound',
                }),
              );
            }

            // Decrement inventory first — fail fast if stock is unavailable
            const decremented = yield* inventoryRepository
              .adjustQuantity(p.inventoryId, -p.quantity)
              .pipe(
                Effect.mapError(wrapInfrastructureError('decrement inventory')),
              );

            if (decremented === 0) {
              return yield* Effect.fail(
                new FulfillmentPickFailed({
                  orderItemId: p.orderItemId,
                  messageKey: 'fulfillment.insufficientInventory',
                }),
              );
            }

            // Atomic increment — returns 0 rows if it would over-pick
            const updated = yield* orderItemsRepository
              .incrementPicked(p.orderItemId, p.quantity)
              .pipe(
                Effect.mapError(
                  wrapInfrastructureError('increment quantity_picked'),
                ),
              );

            if (updated === 0) {
              return yield* Effect.fail(
                new FulfillmentPickFailed({
                  orderItemId: p.orderItemId,
                  messageKey: 'fulfillment.overPick',
                }),
              );
            }

            // Look up inventory record for location context
            const inv = yield* inventoryRepository
              .findById(p.inventoryId)
              .pipe(Effect.mapError(wrapInfrastructureError('load inventory')));

            // Record stock movement
            yield* stockMovementsRepository
              .create({
                product_id: item.product_id,
                from_location_id: inv?.location_id ?? null,
                quantity: p.quantity,
                reason: StockMovementReason.SALE,
                order_id: input.orderId,
                user_id: input.actorId,
              })
              .pipe(
                Effect.mapError(
                  wrapInfrastructureError('create stock movement'),
                ),
              );
          }

          const updated = yield* loadOrderOrFail(input.orderId);
          return toView(updated);
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
              messageKey: 'fulfillment.packNotImplemented',
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
              messageKey: 'fulfillment.shipNotImplemented',
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
