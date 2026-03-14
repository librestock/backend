import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateOrderSchema,
  OrderIdSchema,
  OrderQuerySchema,
  UpdateOrderSchema,
  UpdateOrderStatusSchema,
} from '@librestock/types/orders';
import { Permission, Resource } from '@librestock/types/auth';
import {
  type CreateOrderType as CreateOrder,
  type OrderQueryType as OrderQuery,
  type UpdateOrderType as UpdateOrder,
  type UpdateOrderStatusType as UpdateOrderStatus,
} from '@librestock/types/orders';
import {
  getUserIdFromSession,
  getUserSession,
  type AuthRequest,
} from '../../common/auth/session';
import { RequirePermission } from '../../common/decorators';
import { Auditable } from '../../common/decorators/auditable.decorator';
import { StandardThrottle } from '../../common/decorators/throttle.decorator';
import { EffectPipe } from '../../common/effect/effect-pipe';
import { ApiEffectBody, ApiEffectQuery } from '../../common/effect/swagger';
import { AuditAction, AuditEntityType } from '../../common/enums';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { MessageResponseDto } from '../../common/dto/message-response.dto';
import { runEffect } from '../../common/effect/run-effect';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { HateoasInterceptor } from '../../common/hateoas/hateoas.interceptor';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { OrderResponseDto, PaginatedOrdersResponseDto } from './dto';
import { DeleteOrderHateoas, OrderHateoas } from './orders.hateoas';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@StandardThrottle()
@UseGuards(PermissionGuard)
@RequirePermission(Resource.STOCK, Permission.READ)
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @UseInterceptors(HateoasInterceptor)
  @OrderHateoas()
  @ApiOperation({
    summary: 'List orders with pagination and filtering',
    operationId: 'listOrders',
  })
  @ApiEffectQuery(OrderQuerySchema)
  @ApiResponse({ status: 200, type: PaginatedOrdersResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async listOrders(
    @Query(new EffectPipe(OrderQuerySchema)) query: OrderQuery,
  ): Promise<PaginatedOrdersResponseDto> {
    return runEffect(this.ordersService.findAllPaginated(query));
  }

  @Get(':id')
  @UseInterceptors(HateoasInterceptor)
  @OrderHateoas()
  @ApiOperation({ summary: 'Get order by ID', operationId: 'getOrder' })
  @ApiParam({ name: 'id', description: 'Order UUID', type: String })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getOrder(
    @Param('id', new EffectPipe(OrderIdSchema)) id: string,
  ): Promise<OrderResponseDto> {
    return runEffect(this.ordersService.findOne(id));
  }

  @Post()
  @RequirePermission(Resource.STOCK, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @OrderHateoas()
  @Auditable({
    action: AuditAction.CREATE,
    entityType: AuditEntityType.ORDER,
    entityIdFromResponse: 'id',
  })
  @ApiOperation({ summary: 'Create order', operationId: 'createOrder' })
  @ApiEffectBody(CreateOrderSchema)
  @ApiResponse({ status: 201, type: OrderResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async createOrder(
    @Body(new EffectPipe(CreateOrderSchema)) createOrderDto: CreateOrder,
    @Req() req: AuthRequest,
  ): Promise<OrderResponseDto> {
    const userId = getUserIdFromSession(getUserSession(req));
    return runEffect(this.ordersService.create(createOrderDto, userId ?? ''));
  }

  @Put(':id')
  @RequirePermission(Resource.STOCK, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @OrderHateoas()
  @Auditable({
    action: AuditAction.UPDATE,
    entityType: AuditEntityType.ORDER,
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Update order', operationId: 'updateOrder' })
  @ApiParam({ name: 'id', description: 'Order UUID', type: String })
  @ApiEffectBody(UpdateOrderSchema)
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async updateOrder(
    @Param('id', new EffectPipe(OrderIdSchema)) id: string,
    @Body(new EffectPipe(UpdateOrderSchema)) updateOrderDto: UpdateOrder,
  ): Promise<OrderResponseDto> {
    return runEffect(this.ordersService.update(id, updateOrderDto));
  }

  @Patch(':id/status')
  @RequirePermission(Resource.STOCK, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @OrderHateoas()
  @Auditable({
    action: AuditAction.STATUS_CHANGE,
    entityType: AuditEntityType.ORDER,
    entityIdParam: 'id',
  })
  @ApiOperation({
    summary: 'Update order status',
    operationId: 'updateOrderStatus',
  })
  @ApiParam({ name: 'id', description: 'Order UUID', type: String })
  @ApiEffectBody(UpdateOrderStatusSchema)
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async updateOrderStatus(
    @Param('id', new EffectPipe(OrderIdSchema)) id: string,
    @Body(new EffectPipe(UpdateOrderStatusSchema))
    updateStatusDto: UpdateOrderStatus,
  ): Promise<OrderResponseDto> {
    return runEffect(this.ordersService.updateStatus(id, updateStatusDto));
  }

  @Delete(':id')
  @RequirePermission(Resource.STOCK, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @DeleteOrderHateoas()
  @Auditable({
    action: AuditAction.DELETE,
    entityType: AuditEntityType.ORDER,
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Delete order', operationId: 'deleteOrder' })
  @ApiParam({ name: 'id', description: 'Order UUID', type: String })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async deleteOrder(
    @Param('id', new EffectPipe(OrderIdSchema)) id: string,
  ): Promise<MessageResponseDto> {
    await runEffect(this.ordersService.delete(id));
    return { message: 'Order deleted successfully' };
  }
}
