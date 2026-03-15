import { Effect, Layer } from 'effect';
import { OrderStatus, type CreateOrder } from '@librestock/types/orders';
import { makeOrdersService } from './service';
import { OrderItemsRepository, OrdersRepository } from './repository';
import { ClientsService } from '../clients/service';
import { ProductsService } from '../products/service';

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
  items: [],
  created_at: new Date('2026-03-10T00:00:00.000Z'),
  updated_at: new Date('2026-03-10T00:00:00.000Z'),
  ...overrides,
});

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

const makeMockOrdersRepository = (
  overrides: Partial<Record<keyof import('./repository').OrdersRepository, jest.Mock>> = {},
) => ({
  findAllPaginated: jest.fn().mockResolvedValue({
    data: [makeOrderEntity({ items: [makeOrderItemEntity()] })],
    total: 1,
    page: 1,
    limit: 20,
    total_pages: 1,
  }),
  findById: jest.fn().mockResolvedValue(
    makeOrderEntity({ items: [makeOrderItemEntity()] }),
  ),
  create: jest.fn().mockResolvedValue(makeOrderEntity()),
  update: jest.fn().mockResolvedValue(1),
  delete: jest.fn().mockResolvedValue(undefined),
  getNextOrderNumberSequence: jest.fn().mockResolvedValue(1),
  existsById: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const makeMockOrderItemsRepository = (
  overrides: Partial<Record<keyof import('./repository').OrderItemsRepository, jest.Mock>> = {},
) => ({
  findByOrderId: jest.fn().mockResolvedValue([makeOrderItemEntity()]),
  createMany: jest.fn().mockResolvedValue([makeOrderItemEntity()]),
  deleteByOrderId: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeMockClientsService = () =>
  ({
    existsById: jest.fn().mockResolvedValue(true),
  }) as any;

const makeMockProductsService = () =>
  ({
    existsById: jest.fn().mockResolvedValue(true),
  }) as any;

const buildService = (
  ordersRepository = makeMockOrdersRepository(),
  orderItemsRepository = makeMockOrderItemsRepository(),
  clientsService = makeMockClientsService(),
  productsService = makeMockProductsService(),
) =>
  Effect.runPromise(
    makeOrdersService.pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.succeed(OrdersRepository, ordersRepository as any),
          Layer.succeed(OrderItemsRepository, orderItemsRepository as any),
          Layer.succeed(ClientsService, clientsService),
          Layer.succeed(ProductsService, productsService),
        ),
      ),
    ),
  );

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const fail = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.flip(effect));

describe('Effect OrdersService', () => {
  describe('findAllPaginated', () => {
    it('returns paginated orders', async () => {
      const service = await buildService();
      const result = await run(service.findAllPaginated({ page: 1, limit: 20 }));
      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ page: 1, total: 1 });
    });
  });

  describe('findOne', () => {
    it('returns an order', async () => {
      const service = await buildService();
      const result = await run(service.findOne('order-1'));
      expect(result).toMatchObject({
        id: 'order-1',
        client_name: 'Acme Corp',
        items: [expect.objectContaining({ product_id: 'product-1' })],
      });
    });

    it('fails with OrderNotFound', async () => {
      const ordersRepository = makeMockOrdersRepository({
        findById: jest.fn().mockResolvedValue(null),
      });
      const service = await buildService(ordersRepository);
      const error = await fail(service.findOne('missing'));
      expect(error).toMatchObject({ _tag: 'OrderNotFound' });
    });
  });

  describe('create', () => {
    const dto: CreateOrder = {
      client_id: 'client-1',
      delivery_address: '123 Harbor Dr',
      items: [{ product_id: 'product-1', quantity: 5, unit_price: 30 }],
    };

    it('creates an order, validates dependencies, and reloads', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-03-10T10:00:00.000Z'));
      const ordersRepository = makeMockOrdersRepository({
        create: jest.fn().mockResolvedValue(makeOrderEntity({ id: 'new-order' })),
      });
      const orderItemsRepository = makeMockOrderItemsRepository();
      const clientsService = makeMockClientsService();
      const productsService = makeMockProductsService();
      const service = await buildService(
        ordersRepository,
        orderItemsRepository,
        clientsService,
        productsService,
      );

      const result = await run(service.create(dto, 'user-1'));

      expect(result.id).toBe('order-1');
      expect(clientsService.existsById).toHaveBeenCalledWith('client-1');
      expect(productsService.existsById).toHaveBeenCalledWith('product-1');
      expect(ordersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          total_amount: 150,
          order_number: 'ORD-20260310-00001',
          created_by: 'user-1',
        }),
      );
      expect(orderItemsRepository.createMany).toHaveBeenCalledWith([
        expect.objectContaining({
          order_id: 'new-order',
          product_id: 'product-1',
          quantity: 5,
          subtotal: 150,
        }),
      ]);
      jest.useRealTimers();
    });

    it('fails when client does not exist', async () => {
      const clientsService = {
        existsById: jest.fn().mockResolvedValue(false),
      } as any;
      const service = await buildService(
        undefined,
        undefined,
        clientsService,
      );
      const error = await fail(service.create(dto, 'user-1'));
      expect(error).toMatchObject({ _tag: 'ClientNotFound' });
    });

    it('fails when a product does not exist', async () => {
      const productsService = {
        existsById: jest.fn().mockResolvedValue(false),
      } as any;
      const service = await buildService(
        undefined,
        undefined,
        undefined,
        productsService,
      );
      const error = await fail(service.create(dto, 'user-1'));
      expect(error).toMatchObject({ _tag: 'ProductNotFound' });
    });
  });

  describe('update', () => {
    it('updates an order', async () => {
      const ordersRepository = makeMockOrdersRepository({
        findById: jest
          .fn()
          .mockResolvedValueOnce(makeOrderEntity())
          .mockResolvedValueOnce(
            makeOrderEntity({ delivery_address: 'New Address' }),
          ),
      });
      const service = await buildService(ordersRepository);
      const result = await run(
        service.update('order-1', { delivery_address: 'New Address' }),
      );
      expect(ordersRepository.update).toHaveBeenCalledWith('order-1', {
        delivery_address: 'New Address',
      });
      expect(result.delivery_address).toBe('New Address');
    });

    it('returns the current order when the DTO is empty', async () => {
      const ordersRepository = makeMockOrdersRepository();
      const service = await buildService(ordersRepository);
      await run(service.update('order-1', {}));
      expect(ordersRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('updates status and the state timestamp for valid transitions', async () => {
      const ordersRepository = makeMockOrdersRepository({
        findById: jest
          .fn()
          .mockResolvedValueOnce(
            makeOrderEntity({ status: OrderStatus.DRAFT }),
          )
          .mockResolvedValueOnce(
            makeOrderEntity({
              status: OrderStatus.CONFIRMED,
              confirmed_at: new Date('2026-03-10T10:00:00.000Z'),
            }),
          ),
      });
      const service = await buildService(ordersRepository);
      const result = await run(
        service.updateStatus('order-1', { status: OrderStatus.CONFIRMED }),
      );
      expect(ordersRepository.update).toHaveBeenCalledWith(
        'order-1',
        expect.objectContaining({
          status: OrderStatus.CONFIRMED,
          confirmed_at: expect.any(Date),
        }),
      );
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('fails for invalid transitions', async () => {
      const ordersRepository = makeMockOrdersRepository({
        findById: jest.fn().mockResolvedValue(
          makeOrderEntity({ status: OrderStatus.DELIVERED }),
        ),
      });
      const service = await buildService(ordersRepository);
      const error = await fail(
        service.updateStatus('order-1', { status: OrderStatus.DRAFT }),
      );
      expect(error).toMatchObject({ _tag: 'InvalidOrderStatusTransition' });
    });
  });

  describe('delete', () => {
    it('deletes draft orders', async () => {
      const ordersRepository = makeMockOrdersRepository({
        findById: jest.fn().mockResolvedValue(
          makeOrderEntity({ status: OrderStatus.DRAFT }),
        ),
      });
      const orderItemsRepository = makeMockOrderItemsRepository();
      const service = await buildService(ordersRepository, orderItemsRepository);
      await run(service.delete('order-1'));
      expect(orderItemsRepository.deleteByOrderId).toHaveBeenCalledWith('order-1');
      expect(ordersRepository.delete).toHaveBeenCalledWith('order-1');
    });

    it('fails when deleting a non-draft order', async () => {
      const ordersRepository = makeMockOrdersRepository({
        findById: jest.fn().mockResolvedValue(
          makeOrderEntity({ status: OrderStatus.CONFIRMED }),
        ),
      });
      const service = await buildService(ordersRepository);
      const error = await fail(service.delete('order-1'));
      expect(error).toMatchObject({ _tag: 'CannotDeleteNonDraftOrder' });
    });
  });

  describe('existsById', () => {
    it('delegates to repository', async () => {
      const ordersRepository = makeMockOrdersRepository({
        existsById: jest.fn().mockResolvedValue(false),
      });
      const service = await buildService(ordersRepository);
      const result = await run(service.existsById('order-1'));
      expect(result).toBe(false);
    });
  });
});
