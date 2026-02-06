import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
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
  ApiQuery,
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
import { StandardThrottle, BulkThrottle } from '../../common/decorators/throttle.decorator';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  ProductQueryDto,
  PaginatedProductsResponseDto,
  BulkCreateProductsDto,
  BulkUpdateStatusDto,
  BulkDeleteDto,
  BulkRestoreDto,
  BulkOperationResultDto,
} from './dto';
import { ProductsService } from './products.service';
import {
  ProductHateoas,
  BulkOperationHateoas,
  DeleteProductHateoas,
  BulkDeleteHateoas,
  BulkRestoreHateoas,
} from './products.hateoas';

@ApiTags('Products')
@ApiBearerAuth()
@StandardThrottle()
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @UseInterceptors(HateoasInterceptor)
  @ProductHateoas()
  @ApiOperation({
    summary: 'List products with pagination and filtering',
    operationId: 'listProducts',
  })
  @ApiResponse({ status: 200, type: PaginatedProductsResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async listProducts(
    @Query() query: ProductQueryDto,
  ): Promise<PaginatedProductsResponseDto> {
    return this.productsService.findAllPaginated(query);
  }

  @Get('all')
  @UseInterceptors(HateoasInterceptor)
  @ProductHateoas()
  @ApiOperation({
    summary: 'List all products without pagination',
    operationId: 'listAllProducts',
  })
  @ApiResponse({ status: 200, type: [ProductResponseDto] })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async listAllProducts(): Promise<ProductResponseDto[]> {
    return this.productsService.findAll();
  }

  @Get(':id')
  @UseInterceptors(HateoasInterceptor)
  @ProductHateoas()
  @ApiOperation({ summary: 'Get product by ID', operationId: 'getProduct' })
  @ApiParam({ name: 'id', description: 'Product UUID', type: String })
  @ApiQuery({
    name: 'include_deleted',
    description: 'Include soft-deleted products',
    required: false,
    type: Boolean,
  })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('include_deleted') includeDeleted?: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.findOne(
      id,
      includeDeleted === 'true' || includeDeleted === '1',
    );
  }

  @Get('category/:categoryId')
  @UseInterceptors(HateoasInterceptor)
  @ProductHateoas()
  @ApiOperation({
    summary: 'Get products by category',
    operationId: 'getProductsByCategory',
  })
  @ApiParam({ name: 'categoryId', description: 'Category UUID', type: String })
  @ApiResponse({ status: 200, type: [ProductResponseDto] })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async getProductsByCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<ProductResponseDto[]> {
    return this.productsService.findByCategory(categoryId);
  }

  @Get('category/:categoryId/tree')
  @UseInterceptors(HateoasInterceptor)
  @ProductHateoas()
  @ApiOperation({
    summary: 'Get products by category tree',
    operationId: 'getProductsByCategoryTree',
  })
  @ApiParam({ name: 'categoryId', description: 'Category UUID', type: String })
  @ApiResponse({ status: 200, type: [ProductResponseDto] })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async getProductsByCategoryTree(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<ProductResponseDto[]> {
    return this.productsService.findByCategoryTree(categoryId);
  }

  @Post()
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @ProductHateoas()
  @Auditable({
    action: AuditAction.CREATE,
    entityType: AuditEntityType.PRODUCT,
    entityIdFromResponse: 'id',
  })
  @ApiOperation({ summary: 'Create product', operationId: 'createProduct' })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @Req() req: AuthRequest,
  ): Promise<ProductResponseDto> {
    const userId = getUserIdFromSession(getUserSession(req));
    return this.productsService.create(createProductDto, userId ?? undefined);
  }

  @Post('bulk')
  @BulkThrottle()
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @BulkOperationHateoas()
  @Auditable({
    action: AuditAction.CREATE,
    entityType: AuditEntityType.PRODUCT,
    entityIdFromResponse: 'succeeded',
  })
  @ApiOperation({
    summary: 'Bulk create products',
    operationId: 'bulkCreateProducts',
  })
  @ApiResponse({ status: 201, type: BulkOperationResultDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async bulkCreateProducts(
    @Body() bulkDto: BulkCreateProductsDto,
    @Req() req: AuthRequest,
  ): Promise<BulkOperationResultDto> {
    const userId = getUserIdFromSession(getUserSession(req));
    return this.productsService.bulkCreate(bulkDto, userId ?? undefined);
  }

  @Put(':id')
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @ProductHateoas()
  @Auditable({
    action: AuditAction.UPDATE,
    entityType: AuditEntityType.PRODUCT,
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Update product', operationId: 'updateProduct' })
  @ApiParam({ name: 'id', description: 'Product UUID', type: String })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req: AuthRequest,
  ): Promise<ProductResponseDto> {
    const userId = getUserIdFromSession(getUserSession(req));
    return this.productsService.update(id, updateProductDto, userId ?? undefined);
  }

  @Patch('bulk/status')
  @BulkThrottle()
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @BulkOperationHateoas()
  @Auditable({
    action: AuditAction.STATUS_CHANGE,
    entityType: AuditEntityType.PRODUCT,
    entityIdFromResponse: 'succeeded',
  })
  @ApiOperation({
    summary: 'Bulk update product status',
    operationId: 'bulkUpdateProductStatus',
  })
  @ApiResponse({ status: 200, type: BulkOperationResultDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async bulkUpdateStatus(
    @Body() bulkDto: BulkUpdateStatusDto,
    @Req() req: AuthRequest,
  ): Promise<BulkOperationResultDto> {
    const userId = getUserIdFromSession(getUserSession(req));
    return this.productsService.bulkUpdateStatus(bulkDto, userId ?? undefined);
  }

  @Delete(':id')
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @DeleteProductHateoas()
  @Auditable({
    action: AuditAction.DELETE,
    entityType: AuditEntityType.PRODUCT,
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Delete product', operationId: 'deleteProduct' })
  @ApiParam({ name: 'id', description: 'Product UUID', type: String })
  @ApiQuery({
    name: 'permanent',
    description: 'Permanently delete instead of soft delete',
    required: false,
    type: Boolean,
  })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async deleteProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('permanent') permanent: string,
    @Req() req: AuthRequest,
  ): Promise<MessageResponseDto> {
    const isPermanent = permanent === 'true' || permanent === '1';
    const userId = getUserIdFromSession(getUserSession(req));
    await this.productsService.delete(id, userId ?? undefined, isPermanent);
    return {
      message: isPermanent
        ? 'Product permanently deleted'
        : 'Product deleted successfully',
    };
  }

  @Delete('bulk')
  @BulkThrottle()
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @BulkDeleteHateoas()
  @Auditable({
    action: AuditAction.DELETE,
    entityType: AuditEntityType.PRODUCT,
    entityIdFromResponse: 'succeeded',
  })
  @ApiOperation({
    summary: 'Bulk delete products',
    operationId: 'bulkDeleteProducts',
  })
  @ApiResponse({ status: 200, type: BulkOperationResultDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async bulkDeleteProducts(
    @Body() bulkDto: BulkDeleteDto,
    @Req() req: AuthRequest,
  ): Promise<BulkOperationResultDto> {
    const userId = getUserIdFromSession(getUserSession(req));
    return this.productsService.bulkDelete(bulkDto, userId ?? undefined);
  }

  @Patch(':id/restore')
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @ProductHateoas()
  @Auditable({
    action: AuditAction.RESTORE,
    entityType: AuditEntityType.PRODUCT,
    entityIdParam: 'id',
  })
  @ApiOperation({
    summary: 'Restore deleted product',
    operationId: 'restoreProduct',
  })
  @ApiParam({ name: 'id', description: 'Product UUID', type: String })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async restoreProduct(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.restore(id);
  }

  @Patch('bulk/restore')
  @BulkThrottle()
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @BulkRestoreHateoas()
  @Auditable({
    action: AuditAction.RESTORE,
    entityType: AuditEntityType.PRODUCT,
    entityIdFromResponse: 'succeeded',
  })
  @ApiOperation({
    summary: 'Bulk restore products',
    operationId: 'bulkRestoreProducts',
  })
  @ApiResponse({ status: 200, type: BulkOperationResultDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async bulkRestoreProducts(
    @Body() bulkDto: BulkRestoreDto,
  ): Promise<BulkOperationResultDto> {
    return this.productsService.bulkRestore(bulkDto);
  }
}
