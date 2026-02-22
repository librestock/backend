import {
  Controller,
  Get,
  Post,
  Put,
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
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierResponseDto,
  SupplierQueryDto,
  PaginatedSuppliersResponseDto,
} from './dto';
import { SuppliersService } from './suppliers.service';
import { SupplierHateoas, DeleteSupplierHateoas } from './suppliers.hateoas';

@ApiTags('Suppliers')
@ApiBearerAuth()
@StandardThrottle()
@UseGuards(PermissionGuard)
@RequirePermission(Resource.STOCK, Permission.READ)
@Controller()
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @UseInterceptors(HateoasInterceptor)
  @SupplierHateoas()
  @ApiOperation({
    summary: 'List suppliers with pagination and filtering',
    operationId: 'listSuppliers',
  })
  @ApiResponse({ status: 200, type: PaginatedSuppliersResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async listSuppliers(
    @Query() query: SupplierQueryDto,
  ): Promise<PaginatedSuppliersResponseDto> {
    return this.suppliersService.findAllPaginated(query);
  }

  @Get(':id')
  @UseInterceptors(HateoasInterceptor)
  @SupplierHateoas()
  @ApiOperation({ summary: 'Get supplier by ID', operationId: 'getSupplier' })
  @ApiParam({ name: 'id', description: 'Supplier UUID', type: String })
  @ApiResponse({ status: 200, type: SupplierResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getSupplier(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.findOne(id);
  }

  @Post()
  @RequirePermission(Resource.STOCK, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @SupplierHateoas()
  @Auditable({
    action: AuditAction.CREATE,
    entityType: AuditEntityType.SUPPLIER,
    entityIdFromResponse: 'id',
  })
  @ApiOperation({ summary: 'Create supplier', operationId: 'createSupplier' })
  @ApiResponse({ status: 201, type: SupplierResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async createSupplier(
    @Body() createSupplierDto: CreateSupplierDto,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.create(createSupplierDto);
  }

  @Put(':id')
  @RequirePermission(Resource.STOCK, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @SupplierHateoas()
  @Auditable({
    action: AuditAction.UPDATE,
    entityType: AuditEntityType.SUPPLIER,
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Update supplier', operationId: 'updateSupplier' })
  @ApiParam({ name: 'id', description: 'Supplier UUID', type: String })
  @ApiResponse({ status: 200, type: SupplierResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async updateSupplier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  @RequirePermission(Resource.STOCK, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @DeleteSupplierHateoas()
  @Auditable({
    action: AuditAction.DELETE,
    entityType: AuditEntityType.SUPPLIER,
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Delete supplier', operationId: 'deleteSupplier' })
  @ApiParam({ name: 'id', description: 'Supplier UUID', type: String })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async deleteSupplier(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    await this.suppliersService.delete(id);
    return { message: 'Supplier deleted successfully' };
  }
}
