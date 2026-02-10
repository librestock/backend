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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { Permission, Resource } from '@librestock/types';
import { RequirePermission } from '../../common/decorators';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { MessageResponseDto } from '../../common/dto/message-response.dto';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { HateoasInterceptor } from '../../common/hateoas/hateoas.interceptor';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Auditable } from '../../common/decorators/auditable.decorator';
import { AuditAction, AuditEntityType } from '../../common/enums';
import { StandardThrottle } from '../../common/decorators/throttle.decorator';
import {
  CreateInventoryDto,
  UpdateInventoryDto,
  AdjustInventoryDto,
  InventoryResponseDto,
  InventoryQueryDto,
  PaginatedInventoryResponseDto,
} from './dto';
import { InventoryService } from './inventory.service';
import { InventoryHateoas, DeleteInventoryHateoas } from './inventory.hateoas';

@ApiTags('Inventory')
@ApiBearerAuth()
@StandardThrottle()
@UseGuards(PermissionGuard)
@RequirePermission(Resource.INVENTORY, Permission.READ)
@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @UseInterceptors(HateoasInterceptor)
  @InventoryHateoas()
  @ApiOperation({
    summary: 'List inventory items with pagination and filtering',
    operationId: 'listInventory',
  })
  @ApiResponse({ status: 200, type: PaginatedInventoryResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async listInventory(
    @Query() query: InventoryQueryDto,
  ): Promise<PaginatedInventoryResponseDto> {
    return this.inventoryService.findAllPaginated(query);
  }

  @Get('all')
  @UseInterceptors(HateoasInterceptor)
  @InventoryHateoas()
  @ApiOperation({
    summary: 'List all inventory items without pagination',
    operationId: 'listAllInventory',
  })
  @ApiResponse({ status: 200, type: [InventoryResponseDto] })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async listAllInventory(): Promise<InventoryResponseDto[]> {
    return this.inventoryService.findAll();
  }

  @Get('product/:productId')
  @UseInterceptors(HateoasInterceptor)
  @InventoryHateoas()
  @ApiOperation({
    summary: 'Get inventory by product',
    operationId: 'getInventoryByProduct',
  })
  @ApiParam({ name: 'productId', description: 'Product UUID', type: String })
  @ApiResponse({ status: 200, type: [InventoryResponseDto] })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getInventoryByProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<InventoryResponseDto[]> {
    return this.inventoryService.findByProduct(productId);
  }

  @Get('location/:locationId')
  @UseInterceptors(HateoasInterceptor)
  @InventoryHateoas()
  @ApiOperation({
    summary: 'Get inventory by location',
    operationId: 'getInventoryByLocation',
  })
  @ApiParam({ name: 'locationId', description: 'Location UUID', type: String })
  @ApiResponse({ status: 200, type: [InventoryResponseDto] })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getInventoryByLocation(
    @Param('locationId', ParseUUIDPipe) locationId: string,
  ): Promise<InventoryResponseDto[]> {
    return this.inventoryService.findByLocation(locationId);
  }

  @Get(':id')
  @UseInterceptors(HateoasInterceptor)
  @InventoryHateoas()
  @ApiOperation({
    summary: 'Get inventory item by ID',
    operationId: 'getInventoryItem',
  })
  @ApiParam({ name: 'id', description: 'Inventory UUID', type: String })
  @ApiResponse({ status: 200, type: InventoryResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getInventoryItem(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.findOne(id);
  }

  @Post()
  @RequirePermission(Resource.INVENTORY, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @InventoryHateoas()
  @Auditable({
    action: AuditAction.CREATE,
    entityType: AuditEntityType.INVENTORY,
    entityIdFromResponse: 'id',
  })
  @ApiOperation({
    summary: 'Create inventory item',
    operationId: 'createInventoryItem',
  })
  @ApiResponse({ status: 201, type: InventoryResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async createInventoryItem(
    @Body() createInventoryDto: CreateInventoryDto,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.create(createInventoryDto);
  }

  @Put(':id')
  @RequirePermission(Resource.INVENTORY, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @InventoryHateoas()
  @Auditable({
    action: AuditAction.UPDATE,
    entityType: AuditEntityType.INVENTORY,
    entityIdParam: 'id',
  })
  @ApiOperation({
    summary: 'Update inventory item',
    operationId: 'updateInventoryItem',
  })
  @ApiParam({ name: 'id', description: 'Inventory UUID', type: String })
  @ApiResponse({ status: 200, type: InventoryResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async updateInventoryItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.update(id, updateInventoryDto);
  }

  @Patch(':id/adjust')
  @RequirePermission(Resource.INVENTORY, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @InventoryHateoas()
  @Auditable({
    action: AuditAction.ADJUST_QUANTITY,
    entityType: AuditEntityType.INVENTORY,
    entityIdParam: 'id',
  })
  @ApiOperation({
    summary: 'Adjust inventory quantity',
    operationId: 'adjustInventoryQuantity',
  })
  @ApiParam({ name: 'id', description: 'Inventory UUID', type: String })
  @ApiResponse({ status: 200, type: InventoryResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async adjustInventoryQuantity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() adjustInventoryDto: AdjustInventoryDto,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.adjustQuantity(id, adjustInventoryDto);
  }

  @Delete(':id')
  @RequirePermission(Resource.INVENTORY, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @DeleteInventoryHateoas()
  @Auditable({
    action: AuditAction.DELETE,
    entityType: AuditEntityType.INVENTORY,
    entityIdParam: 'id',
  })
  @ApiOperation({
    summary: 'Delete inventory item',
    operationId: 'deleteInventoryItem',
  })
  @ApiParam({ name: 'id', description: 'Inventory UUID', type: String })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async deleteInventoryItem(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    await this.inventoryService.delete(id);
    return { message: 'Inventory item deleted successfully' };
  }
}
