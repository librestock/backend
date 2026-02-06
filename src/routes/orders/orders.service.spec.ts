import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@librestock/types';
import { OrdersService } from './orders.service';
import { OrderRepository, type PaginatedResult } from './orders.repository';
import { OrderItemRepository } from './order-items.repository';
import { ClientsService } from '../clients/clients.service';
import { ProductsService } from '../products/products.service';
import { type Order } from './entities/order.entity';
import { type OrderItem } from './entities/order-item.entity';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<OrderRepository>;
  let orderItemRepository: jest.Mocked<OrderItemRepository>;
  let clientsService: jest.Mocked<ClientsService>;
  let productsService: jest.Mocked<ProductsService>;

  const mockOrder: Order = {
    id: 'order-001',
    order_number: 'ORD-20240101-0001',
    client_id: 'client-001',
    client: {
      id: 'client-001',
      company_name: 'Acme Corp',
      contact_person: 'John Doe',
      email: 'john@acme.com',
      yacht_name: null,
      phone: null,
      billing_address: null,
      default_delivery_address: null,
      account_status: 'ACTIVE' as any,
      payment_terms: null,
      credit_limit: null,
      notes: null,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    },
    status: OrderStatus.DRAFT,
    delivery_address: '123 Harbor Dr',
    delivery_deadline: null,
    yacht_name: null,
    special_instructions: null,
    total_amount: 150,
    assigned_to: null,
    created_by: 'user-001',
    confirmed_at: null,
    shipped_at: null,
    delivered_at: null,
    kanban_task_id: null,
    items: [],
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  const mockOrderItem: OrderItem = {
    id: 'item-001',
    order_id: 'order-001',
    order: mockOrder,
    product_id: 'product-001',
    product: {
      id: 'product-001',
      name: 'Widget',
      sku: 'WDG-001',
    } as any,
    quantity: 5,
    unit_price: 30,
    subtotal: 150,
    notes: null,
    quantity_picked: 0,
    quantity_packed: 0,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  const mockOrderWithItems: Order = {
    ...mockOrder,
    items: [mockOrderItem],
  };

  beforeEach(async () => {
    const mockOrderRepository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countByPrefix: jest.fn(),
      existsById: jest.fn(),
    };

    const mockOrderItemRepository = {
      findByOrderId: jest.fn(),
      createMany: jest.fn(),
      deleteByOrderId: jest.fn(),
    };

    const mockClientsService = {
      existsById: jest.fn(),
    };

    const mockProductsService = {
      existsById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrderRepository, useValue: mockOrderRepository },
        { provide: OrderItemRepository, useValue: mockOrderItemRepository },
        { provide: ClientsService, useValue: mockClientsService },
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get(OrderRepository);
    orderItemRepository = module.get(OrderItemRepository);
    clientsService = module.get(ClientsService);
    productsService = module.get(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPaginated', () => {
    it('should return paginated orders', async () => {
      const paginatedResult: PaginatedResult<Order> = {
        data: [mockOrderWithItems],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      };
      orderRepository.findAllPaginated.mockResolvedValue(paginatedResult);

      const result = await service.findAllPaginated({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.has_next).toBe(false);
      expect(result.meta.has_previous).toBe(false);
    });

    it('should handle pagination metadata correctly', async () => {
      const paginatedResult: PaginatedResult<Order> = {
        data: [mockOrderWithItems],
        total: 50,
        page: 2,
        limit: 20,
        total_pages: 3,
      };
      orderRepository.findAllPaginated.mockResolvedValue(paginatedResult);

      const result = await service.findAllPaginated({ page: 2, limit: 20 });

      expect(result.meta.has_next).toBe(true);
      expect(result.meta.has_previous).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      orderRepository.findById.mockResolvedValue(mockOrderWithItems);

      const result = await service.findOne('order-001');

      expect(result.id).toBe('order-001');
      expect(result.order_number).toBe('ORD-20240101-0001');
      expect(result.client_name).toBe('Acme Corp');
    });

    it('should throw NotFoundException when order does not exist', async () => {
      orderRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent')).rejects.toThrow(
        'Order not found',
      );
    });
  });

  describe('create', () => {
    const createDto = {
      client_id: 'client-001',
      delivery_address: '123 Harbor Dr',
      items: [
        { product_id: 'product-001', quantity: 5, unit_price: 30 },
      ],
    };

    it('should create an order with items and calculate total', async () => {
      clientsService.existsById.mockResolvedValue(true);
      productsService.existsById.mockResolvedValue(true);
      orderRepository.countByPrefix.mockResolvedValue(0);
      orderRepository.create.mockResolvedValue({
        ...mockOrder,
        id: 'new-order',
      });
      orderItemRepository.createMany.mockResolvedValue([mockOrderItem]);
      orderRepository.findById.mockResolvedValue(mockOrderWithItems);

      const result = await service.create(createDto, 'user-001');

      expect(result.id).toBe('order-001');
      expect(orderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'client-001',
          delivery_address: '123 Harbor Dr',
          total_amount: 150,
          status: OrderStatus.DRAFT,
          created_by: 'user-001',
        }),
      );
      expect(orderItemRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            product_id: 'product-001',
            quantity: 5,
            unit_price: 30,
            subtotal: 150,
          }),
        ]),
      );
    });

    it('should calculate total_amount from multiple items', async () => {
      const multiItemDto = {
        client_id: 'client-001',
        delivery_address: '123 Harbor Dr',
        items: [
          { product_id: 'product-001', quantity: 2, unit_price: 10 },
          { product_id: 'product-002', quantity: 3, unit_price: 20 },
        ],
      };

      clientsService.existsById.mockResolvedValue(true);
      productsService.existsById.mockResolvedValue(true);
      orderRepository.countByPrefix.mockResolvedValue(0);
      orderRepository.create.mockResolvedValue(mockOrder);
      orderItemRepository.createMany.mockResolvedValue([]);
      orderRepository.findById.mockResolvedValue(mockOrderWithItems);

      await service.create(multiItemDto, 'user-001');

      expect(orderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ total_amount: 80 }),
      );
    });

    it('should throw BadRequestException when client does not exist', async () => {
      clientsService.existsById.mockResolvedValue(false);

      await expect(service.create(createDto, 'user-001')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto, 'user-001')).rejects.toThrow(
        'Client not found',
      );
    });

    it('should throw BadRequestException when product does not exist', async () => {
      clientsService.existsById.mockResolvedValue(true);
      productsService.existsById.mockResolvedValue(false);

      await expect(service.create(createDto, 'user-001')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto, 'user-001')).rejects.toThrow(
        'Product product-001 not found',
      );
    });
  });

  describe('updateStatus', () => {
    it('should transition from DRAFT to CONFIRMED', async () => {
      const draftOrder = { ...mockOrderWithItems, status: OrderStatus.DRAFT };
      orderRepository.findById
        .mockResolvedValueOnce(draftOrder)
        .mockResolvedValueOnce({
          ...draftOrder,
          status: OrderStatus.CONFIRMED,
        });
      orderRepository.update.mockResolvedValue(1);

      const result = await service.updateStatus('order-001', {
        status: OrderStatus.CONFIRMED,
      });

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(orderRepository.update).toHaveBeenCalledWith(
        'order-001',
        expect.objectContaining({
          status: OrderStatus.CONFIRMED,
          confirmed_at: expect.any(Date),
        }),
      );
    });

    it('should transition from PACKED to SHIPPED', async () => {
      const packedOrder = {
        ...mockOrderWithItems,
        status: OrderStatus.PACKED,
      };
      orderRepository.findById
        .mockResolvedValueOnce(packedOrder)
        .mockResolvedValueOnce({
          ...packedOrder,
          status: OrderStatus.SHIPPED,
        });
      orderRepository.update.mockResolvedValue(1);

      const result = await service.updateStatus('order-001', {
        status: OrderStatus.SHIPPED,
      });

      expect(result.status).toBe(OrderStatus.SHIPPED);
      expect(orderRepository.update).toHaveBeenCalledWith(
        'order-001',
        expect.objectContaining({
          status: OrderStatus.SHIPPED,
          shipped_at: expect.any(Date),
        }),
      );
    });

    it('should set delivered_at when transitioning to DELIVERED', async () => {
      const shippedOrder = {
        ...mockOrderWithItems,
        status: OrderStatus.SHIPPED,
      };
      orderRepository.findById
        .mockResolvedValueOnce(shippedOrder)
        .mockResolvedValueOnce({
          ...shippedOrder,
          status: OrderStatus.DELIVERED,
        });
      orderRepository.update.mockResolvedValue(1);

      await service.updateStatus('order-001', {
        status: OrderStatus.DELIVERED,
      });

      expect(orderRepository.update).toHaveBeenCalledWith(
        'order-001',
        expect.objectContaining({
          status: OrderStatus.DELIVERED,
          delivered_at: expect.any(Date),
        }),
      );
    });

    it('should throw BadRequestException for invalid transition', async () => {
      const deliveredOrder = {
        ...mockOrderWithItems,
        status: OrderStatus.DELIVERED,
      };
      orderRepository.findById.mockResolvedValue(deliveredOrder);

      await expect(
        service.updateStatus('order-001', { status: OrderStatus.DRAFT }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateStatus('order-001', { status: OrderStatus.DRAFT }),
      ).rejects.toThrow('Cannot transition from DELIVERED to DRAFT');
    });

    it('should throw BadRequestException for CANCELLED to any status', async () => {
      const cancelledOrder = {
        ...mockOrderWithItems,
        status: OrderStatus.CANCELLED,
      };
      orderRepository.findById.mockResolvedValue(cancelledOrder);

      await expect(
        service.updateStatus('order-001', { status: OrderStatus.CONFIRMED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow ON_HOLD to CONFIRMED', async () => {
      const onHoldOrder = {
        ...mockOrderWithItems,
        status: OrderStatus.ON_HOLD,
      };
      orderRepository.findById
        .mockResolvedValueOnce(onHoldOrder)
        .mockResolvedValueOnce({
          ...onHoldOrder,
          status: OrderStatus.CONFIRMED,
        });
      orderRepository.update.mockResolvedValue(1);

      const result = await service.updateStatus('order-001', {
        status: OrderStatus.CONFIRMED,
      });

      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      orderRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateStatus('non-existent', {
          status: OrderStatus.CONFIRMED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a DRAFT order', async () => {
      const draftOrder = { ...mockOrderWithItems, status: OrderStatus.DRAFT };
      orderRepository.findById.mockResolvedValue(draftOrder);
      orderItemRepository.deleteByOrderId.mockResolvedValue(undefined);
      orderRepository.delete.mockResolvedValue(undefined);

      await service.delete('order-001');

      expect(orderItemRepository.deleteByOrderId).toHaveBeenCalledWith(
        'order-001',
      );
      expect(orderRepository.delete).toHaveBeenCalledWith('order-001');
    });

    it('should throw BadRequestException when deleting non-DRAFT order', async () => {
      const confirmedOrder = {
        ...mockOrderWithItems,
        status: OrderStatus.CONFIRMED,
      };
      orderRepository.findById.mockResolvedValue(confirmedOrder);

      await expect(service.delete('order-001')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.delete('order-001')).rejects.toThrow(
        'Only draft orders can be deleted',
      );
    });

    it('should throw NotFoundException when order does not exist', async () => {
      orderRepository.findById.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('existsById', () => {
    it('should return true when order exists', async () => {
      orderRepository.existsById.mockResolvedValue(true);

      const result = await service.existsById('order-001');

      expect(result).toBe(true);
    });

    it('should return false when order does not exist', async () => {
      orderRepository.existsById.mockResolvedValue(false);

      const result = await service.existsById('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('update', () => {
    it('should update order details', async () => {
      const updateDto = { delivery_address: 'New Address' };
      orderRepository.findById
        .mockResolvedValueOnce(mockOrderWithItems)
        .mockResolvedValueOnce({
          ...mockOrderWithItems,
          delivery_address: 'New Address',
        });
      orderRepository.update.mockResolvedValue(1);

      const result = await service.update('order-001', updateDto);

      expect(result.delivery_address).toBe('New Address');
      expect(orderRepository.update).toHaveBeenCalledWith(
        'order-001',
        expect.objectContaining({ delivery_address: 'New Address' }),
      );
    });

    it('should return existing order when no changes provided', async () => {
      orderRepository.findById.mockResolvedValue(mockOrderWithItems);

      const result = await service.update('order-001', {});

      expect(orderRepository.update).not.toHaveBeenCalled();
      expect(result.id).toBe('order-001');
    });

    it('should throw NotFoundException when order does not exist', async () => {
      orderRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { delivery_address: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
