import { Effect, Layer } from 'effect';
import { OrderStatus } from '@librestock/types/orders';
import { InventoryRepository } from '../inventory/repository';
import { OrderItemsRepository, OrdersRepository } from '../orders/repository';
import { StockMovementsRepository } from '../stock-movements/repository';
import { FulfillmentService } from './service';

const makeOrderItemEntity = (overrides: Record<string, any> = {}) => ({
  id: 'item-1',
  order_id: 'order-1',
  product_id: 'product-1',
  product: {
    id: 'product-1',
    name: 'Widget',
    sku: 'WGT-001',
  },
  quantity: 5,
  unit_price: 30,
  subtotal: 150,
  notes: null,
  quantity_picked: 0,
  quantity_packed: 0,
  created_at: new Date('2026-03-10T00:00:00.000Z'),
  updated_at: new Date('2026-03-10T00:00:00.000Z'),
  ...overrides,
});

const makeOrderEntity = (overrides: Record<string, any> = {}) => ({
  id: 'order-1',
  order_number: 'ORD-20260310-00001',
  client_id: 'client-1',
  client: {
    id: 'client-1',
    company_name: 'Acme Corp',
  },
  status: OrderStatus.DRAFT,
  delivery_address: '123 Harbor Dr',
  delivery_deadline: null,
  yacht_name: null,
  special_instructions: null,
  total_amount: 150,
  assigned_to: null,
  created_by: 'user-1',
  confirmed_at: null,
  shipped_at: null,
  delivered_at: null,
  kanban_task_id: null,
  items: [makeOrderItemEntity()],
  created_at: new Date('2026-03-10T00:00:00.000Z'),
  updated_at: new Date('2026-03-10T00:00:00.000Z'),
  ...overrides,
});

const makeMockOrdersRepository = (
  overrides: Record<string, jest.Mock> = {},
) => ({
  findAllPaginated: jest.fn(),
  findById: jest.fn()
    .mockReturnValueOnce(Effect.succeed(makeOrderEntity()))
    .mockReturnValueOnce(
      Effect.succeed(
        makeOrderEntity({
          status: OrderStatus.CONFIRMED,
          assigned_to: 'user-2',
          confirmed_at: new Date('2026-03-10T10:00:00.000Z'),
        }),
      ),
    ),
  create: jest.fn(),
  update: jest.fn().mockReturnValue(Effect.succeed(1)),
  delete: jest.fn(),
  getNextOrderNumberSequence: jest.fn(),
  existsById: jest.fn(),
  ...overrides,
});

const buildService = (
  ordersRepository = makeMockOrdersRepository(),
  orderItemsRepository = {} as any,
  inventoryRepository = {} as any,
  stockMovementsRepository = {} as any,
) =>
  Effect.runPromise(
    FulfillmentService.pipe(
      Effect.provide(
        FulfillmentService.DefaultWithoutDependencies.pipe(
          Layer.provide(
            Layer.mergeAll(
              Layer.succeed(OrdersRepository, ordersRepository as any),
              Layer.succeed(OrderItemsRepository, orderItemsRepository),
              Layer.succeed(InventoryRepository, inventoryRepository),
              Layer.succeed(StockMovementsRepository, stockMovementsRepository),
            ),
          ),
        ),
      ),
    ),
  );

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const fail = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.flip(effect));

describe('Effect FulfillmentService', () => {
  describe('confirm', () => {
    it('confirms a draft order and returns the fulfillment view', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-03-10T10:00:00.000Z'));

      const ordersRepository = makeMockOrdersRepository();
      const service = await buildService(ordersRepository);

      const result = await run(service.confirm('order-1', 'user-2'));

      expect(ordersRepository.update).toHaveBeenCalledWith('order-1', {
        status: OrderStatus.CONFIRMED,
        confirmed_at: new Date('2026-03-10T10:00:00.000Z'),
        assigned_to: 'user-2',
      });
      expect(result).toMatchObject({
        orderId: 'order-1',
        status: OrderStatus.CONFIRMED,
        confirmedAt: new Date('2026-03-10T10:00:00.000Z'),
        shippedAt: null,
        deliveredAt: null,
        items: [
          {
            orderItemId: 'item-1',
            productId: 'product-1',
            quantity: 5,
            quantityPicked: 0,
            quantityPacked: 0,
          },
        ],
      });

      jest.useRealTimers();
    });

    it('fails when confirming a non-draft order', async () => {
      const ordersRepository = makeMockOrdersRepository({
        findById: jest.fn().mockReturnValue(
          Effect.succeed(
            makeOrderEntity({
              status: OrderStatus.CONFIRMED,
              confirmed_at: new Date('2026-03-10T10:00:00.000Z'),
            }),
          ),
        ),
        update: jest.fn().mockReturnValue(Effect.succeed(1)),
      });
      const service = await buildService(ordersRepository);

      const error = await fail(service.confirm('order-1', 'user-2'));

      expect(error).toMatchObject({
        _tag: 'FulfillmentInvalidTransition',
        orderId: 'order-1',
        from: OrderStatus.CONFIRMED,
        to: OrderStatus.CONFIRMED,
      });
      expect(ordersRepository.update).not.toHaveBeenCalled();
    });

    it('fails when the order does not exist', async () => {
      const ordersRepository = makeMockOrdersRepository({
        findById: jest.fn().mockReturnValue(Effect.succeed(null)),
      });
      const service = await buildService(ordersRepository);

      const error = await fail(service.confirm('missing-order', 'user-2'));

      expect(error).toMatchObject({
        _tag: 'FulfillmentOrderNotFound',
        orderId: 'missing-order',
      });
    });

    it('wraps repository failures as infrastructure errors', async () => {
      const cause = new Error('write failed');
      const ordersRepository = makeMockOrdersRepository({
        update: jest.fn().mockReturnValue(Effect.fail(cause)),
      });
      const service = await buildService(ordersRepository);

      const error = await fail(service.confirm('order-1', 'user-2'));

      expect(error).toMatchObject({
        _tag: 'FulfillmentInfrastructureError',
        action: 'confirm order',
        cause,
      });
    });
  });

  describe('pick', () => {
    it('fails with not implemented for a known order', async () => {
      const service = await buildService();

      const error = await fail(
        service.pick({
          orderId: 'order-1',
          actorId: 'user-2',
          picks: [{ orderItemId: 'item-1', inventoryId: 'inventory-1', quantity: 2 }],
        }),
      );

      expect(error).toMatchObject({
        _tag: 'FulfillmentNotImplemented',
        operation: 'pick',
      });
    });
  });

  describe('pack', () => {
    it('fails with not implemented for a known order', async () => {
      const service = await buildService();

      const error = await fail(
        service.pack({
          orderId: 'order-1',
          actorId: 'user-2',
          packs: [{ orderItemId: 'item-1', quantity: 2 }],
        }),
      );

      expect(error).toMatchObject({
        _tag: 'FulfillmentNotImplemented',
        operation: 'pack',
      });
    });
  });

  describe('ship', () => {
    it('fails with not implemented for a known order', async () => {
      const service = await buildService();

      const error = await fail(service.ship('order-1', 'user-2'));

      expect(error).toMatchObject({
        _tag: 'FulfillmentNotImplemented',
        operation: 'ship',
      });
    });
  });
});
