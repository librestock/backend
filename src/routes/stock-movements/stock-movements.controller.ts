import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
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
import { PermissionGuard } from '../../common/guards/permission.guard';
import { HateoasInterceptor } from '../../common/hateoas/hateoas.interceptor';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Auditable } from '../../common/decorators/auditable.decorator';
import { AuditAction, AuditEntityType } from '../../common/enums';
import { StandardThrottle } from '../../common/decorators/throttle.decorator';
import {
  getUserIdFromSession,
  getUserSession,
  type AuthRequest,
} from '../../common/auth/session';
import {
  CreateStockMovementDto,
  StockMovementResponseDto,
  StockMovementQueryDto,
  PaginatedStockMovementsResponseDto,
} from './dto';
import { StockMovementsService } from './stock-movements.service';
import { StockMovementHateoas } from './stock-movements.hateoas';

@ApiTags('Stock Movements')
@ApiBearerAuth()
@StandardThrottle()
@UseGuards(PermissionGuard)
@RequirePermission(Resource.STOCK, Permission.READ)
@Controller()
export class StockMovementsController {
  constructor(
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  @Get()
  @UseInterceptors(HateoasInterceptor)
  @StockMovementHateoas()
  @ApiOperation({
    summary: 'List stock movements with pagination and filtering',
    operationId: 'listStockMovements',
  })
  @ApiResponse({ status: 200, type: PaginatedStockMovementsResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async listStockMovements(
    @Query() query: StockMovementQueryDto,
  ): Promise<PaginatedStockMovementsResponseDto> {
    return this.stockMovementsService.findAllPaginated(query);
  }

  @Get('product/:productId')
  @UseInterceptors(HateoasInterceptor)
  @StockMovementHateoas()
  @ApiOperation({
    summary: 'Get stock movements by product',
    operationId: 'getStockMovementsByProduct',
  })
  @ApiParam({ name: 'productId', description: 'Product UUID', type: String })
  @ApiResponse({ status: 200, type: [StockMovementResponseDto] })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getByProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<StockMovementResponseDto[]> {
    return this.stockMovementsService.findByProduct(productId);
  }

  @Get('location/:locationId')
  @UseInterceptors(HateoasInterceptor)
  @StockMovementHateoas()
  @ApiOperation({
    summary: 'Get stock movements by location',
    operationId: 'getStockMovementsByLocation',
  })
  @ApiParam({
    name: 'locationId',
    description: 'Location UUID',
    type: String,
  })
  @ApiResponse({ status: 200, type: [StockMovementResponseDto] })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getByLocation(
    @Param('locationId', ParseUUIDPipe) locationId: string,
  ): Promise<StockMovementResponseDto[]> {
    return this.stockMovementsService.findByLocation(locationId);
  }

  @Get(':id')
  @UseInterceptors(HateoasInterceptor)
  @StockMovementHateoas()
  @ApiOperation({
    summary: 'Get stock movement by ID',
    operationId: 'getStockMovement',
  })
  @ApiParam({ name: 'id', description: 'Stock movement UUID', type: String })
  @ApiResponse({ status: 200, type: StockMovementResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getStockMovement(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StockMovementResponseDto> {
    return this.stockMovementsService.findOne(id);
  }

  @Post()
  @RequirePermission(Resource.STOCK, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @StockMovementHateoas()
  @Auditable({
    action: AuditAction.CREATE,
    entityType: AuditEntityType.STOCK_MOVEMENT,
    entityIdFromResponse: 'id',
  })
  @ApiOperation({
    summary: 'Create stock movement',
    operationId: 'createStockMovement',
  })
  @ApiResponse({ status: 201, type: StockMovementResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async createStockMovement(
    @Body() dto: CreateStockMovementDto,
    @Req() req: AuthRequest,
  ): Promise<StockMovementResponseDto> {
    const userId = getUserIdFromSession(getUserSession(req));
    return this.stockMovementsService.create(dto, userId!);
  }
}
