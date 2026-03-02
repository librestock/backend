import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus } from '@librestock/types';
import { toPaginationMeta } from '../../common/utils/pagination.utils';
import { ClientsService } from '../clients/clients.service';
import { ProductsService } from '../products/products.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderRepository } from './orders.repository';
import { OrderItemRepository } from './order-items.repository';
import { getOrderState } from './state/order-state';
import {
  ORDER_STATUS_CHANGED,
  OrderStatusChangedEvent,
} from './events/order-status-changed.event';
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  OrderQueryDto,
  OrderResponseDto,
  OrderItemResponseDto,
  PaginatedOrdersResponseDto,
} from './dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderItemRepository: OrderItemRepository,
    private readonly clientsService: ClientsService,
    private readonly productsService: ProductsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAllPaginated(
    query: OrderQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    const result = await this.orderRepository.findAllPaginated(query);

    return {
      data: result.data.map((order) => this.toResponseDto(order)),
      meta: toPaginationMeta(result.total, result.page, result.limit),
    };
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.toResponseDto(order);
  }

  async create(
    dto: CreateOrderDto,
    userId: string,
  ): Promise<OrderResponseDto> {
    const clientExists = await this.clientsService.existsById(dto.client_id);
    if (!clientExists) {
      throw new BadRequestException('Client not found');
    }

    for (const item of dto.items) {
      const productExists = await this.productsService.existsById(
        item.product_id,
      );
      if (!productExists) {
        throw new BadRequestException(
          `Product ${item.product_id} not found`,
        );
      }
    }

    const total_amount = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0,
    );

    const order = await this.createOrderWithUniqueNumber({
      client_id: dto.client_id,
      delivery_address: dto.delivery_address,
      delivery_deadline: dto.delivery_deadline
        ? new Date(dto.delivery_deadline)
        : null,
      yacht_name: dto.yacht_name ?? null,
      special_instructions: dto.special_instructions ?? null,
      total_amount,
      created_by: userId,
      status: OrderStatus.DRAFT,
    });

    const items = dto.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.quantity * item.unit_price,
      notes: item.notes ?? null,
    }));
    await this.orderItemRepository.createMany(items);

    const orderWithRelations = await this.orderRepository.findById(order.id);
    return this.toResponseDto(orderWithRelations!);
  }

  private async createOrderWithUniqueNumber(
    data: Partial<Order>,
    maxRetries = 3,
  ): Promise<Order> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const order_number = await this.generateOrderNumber();
      try {
        return await this.orderRepository.create({ ...data, order_number });
      } catch (error: unknown) {
        const isUniqueViolation =
          error instanceof Error &&
          'code' in error &&
          (error as { code: string }).code === '23505';
        if (!isUniqueViolation || attempt === maxRetries) {
          throw error;
        }
      }
    }
    throw new BadRequestException('Failed to generate unique order number');
  }

  async update(
    id: string,
    dto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    await this.getOrderOrFail(id);

    if (Object.keys(dto).length === 0) {
      const order = await this.orderRepository.findById(id);
      return this.toResponseDto(order!);
    }

    const updateData: Partial<Order> = {};
    if (dto.delivery_address !== undefined)
      updateData.delivery_address = dto.delivery_address;
    if (dto.delivery_deadline !== undefined)
      updateData.delivery_deadline = dto.delivery_deadline
        ? new Date(dto.delivery_deadline)
        : null;
    if (dto.yacht_name !== undefined) updateData.yacht_name = dto.yacht_name;
    if (dto.special_instructions !== undefined)
      updateData.special_instructions = dto.special_instructions;
    if (dto.assigned_to !== undefined)
      updateData.assigned_to = dto.assigned_to;

    await this.orderRepository.update(id, updateData);

    const updated = await this.orderRepository.findById(id);
    return this.toResponseDto(updated!);
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const order = await this.getOrderOrFail(id);

    const currentState = getOrderState(order.status);
    const targetState = getOrderState(dto.status);

    currentState.validateTransition(dto.status);
    targetState.validateEntry(order);

    await this.orderRepository.update(id, { status: dto.status });

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

    const updated = await this.orderRepository.findById(id);
    return this.toResponseDto(updated!);
  }

  async delete(id: string): Promise<void> {
    const order = await this.getOrderOrFail(id);
    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException('Only draft orders can be deleted');
    }
    await this.orderItemRepository.deleteByOrderId(id);
    await this.orderRepository.delete(id);
  }

  async existsById(id: string): Promise<boolean> {
    return this.orderRepository.existsById(id);
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const prefix = `ORD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const count = await this.orderRepository.countByPrefix(prefix);
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  private async getOrderOrFail(id: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  private toResponseDto(order: Order): OrderResponseDto {
    return {
      id: order.id,
      order_number: order.order_number,
      client_id: order.client_id,
      client_name: order.client?.company_name ?? null,
      status: order.status,
      delivery_address: order.delivery_address,
      delivery_deadline: order.delivery_deadline,
      yacht_name: order.yacht_name,
      special_instructions: order.special_instructions,
      total_amount: Number(order.total_amount),
      assigned_to: order.assigned_to,
      created_by: order.created_by,
      confirmed_at: order.confirmed_at,
      shipped_at: order.shipped_at,
      delivered_at: order.delivered_at,
      kanban_task_id: order.kanban_task_id,
      items: (order.items ?? []).map((item) => this.toItemResponseDto(item)),
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  }

  private toItemResponseDto(item: OrderItem): OrderItemResponseDto {
    return {
      id: item.id,
      product_id: item.product_id,
      product_name: item.product?.name ?? null,
      product_sku: item.product?.sku ?? null,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      subtotal: Number(item.subtotal),
      notes: item.notes,
      quantity_picked: item.quantity_picked,
      quantity_packed: item.quantity_packed,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }
}
