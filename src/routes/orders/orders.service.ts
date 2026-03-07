import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus } from '@librestock/types/orders'
import { toPaginatedResponse } from '../../common/utils/pagination.utils';
import { ClientsService } from '../clients/clients.service';
import { ProductsService } from '../products/products.service';
import { Order } from './entities/order.entity';
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
  PaginatedOrdersResponseDto,
} from './dto';
import { toOrderResponseDto } from './orders.utils';

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

    return toPaginatedResponse(result, toOrderResponseDto);
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return toOrderResponseDto(order);
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

    const order_number = await this.generateOrderNumber();
    const order = await this.orderRepository.create({
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
      order_number,
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
    return toOrderResponseDto(orderWithRelations!);
  }

  async update(
    id: string,
    dto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    await this.getOrderOrFail(id);

    if (Object.keys(dto).length === 0) {
      const order = await this.orderRepository.findById(id);
      return toOrderResponseDto(order!);
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
    return toOrderResponseDto(updated!);
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
    return toOrderResponseDto(updated!);
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
    const sequence = await this.orderRepository.getNextOrderNumberSequence();
    return `${prefix}-${String(sequence).padStart(5, '0')}`;
  }

  private async getOrderOrFail(id: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }
}
