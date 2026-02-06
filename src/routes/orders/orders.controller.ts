import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { MessageResponseDto } from '../../common/dto/message-response.dto';
import {
  getUserIdFromSession,
  getUserSession,
  type AuthRequest,
} from '../../common/auth/session';
import { HateoasInterceptor } from '../../common/hateoas/hateoas.interceptor';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Auditable } from '../../common/decorators/auditable.decorator';
import { AuditAction, AuditEntityType } from '../../common/enums';
import { StandardThrottle } from '../../common/decorators/throttle.decorator';
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  OrderResponseDto,
  OrderQueryDto,
  PaginatedOrdersResponseDto,
} from './dto';
import { OrdersService } from './orders.service';
import { OrderHateoas, DeleteOrderHateoas } from './orders.hateoas';

@ApiTags('Orders')
@ApiBearerAuth()
@StandardThrottle()
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
  @ApiResponse({ status: 200, type: PaginatedOrdersResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async listOrders(
    @Query() query: OrderQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    return this.ordersService.findAllPaginated(query);
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
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.findOne(id);
  }

  @Post()
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @OrderHateoas()
  @Auditable({
    action: AuditAction.CREATE,
    entityType: AuditEntityType.ORDER,
    entityIdFromResponse: 'id',
  })
  @ApiOperation({ summary: 'Create order', operationId: 'createOrder' })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: AuthRequest,
  ): Promise<OrderResponseDto> {
    const userId = getUserIdFromSession(getUserSession(req));
    return this.ordersService.create(createOrderDto, userId ?? '');
  }

  @Put(':id')
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @OrderHateoas()
  @Auditable({
    action: AuditAction.UPDATE,
    entityType: AuditEntityType.ORDER,
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Update order', operationId: 'updateOrder' })
  @ApiParam({ name: 'id', description: 'Order UUID', type: String })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async updateOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Patch(':id/status')
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
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateStatus(id, updateStatusDto);
  }

  @Delete(':id')
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
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    await this.ordersService.delete(id);
    return { message: 'Order deleted successfully' };
  }
}
