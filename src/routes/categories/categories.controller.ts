import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CategoryWithChildrenResponseDto } from './dto/category-with-children-response.dto';
import { CategoryHateoas, DeleteCategoryHateoas } from './categories.hateoas';

@ApiTags('Categories')
@ApiBearerAuth()
@StandardThrottle()
@UseGuards(PermissionGuard)
@RequirePermission(Resource.PRODUCTS, Permission.READ)
@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @UseInterceptors(HateoasInterceptor)
  @CategoryHateoas()
  @ApiOperation({
    summary: 'List all categories',
    description: 'Retrieves all product categories with their child categories',
    operationId: 'listCategories',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    type: [CategoryWithChildrenResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  async listCategories(): Promise<CategoryWithChildrenResponseDto[]> {
    return this.categoriesService.findAll();
  }

  @Post()
  @RequirePermission(Resource.PRODUCTS, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @CategoryHateoas()
  @Auditable({
    action: AuditAction.CREATE,
    entityType: AuditEntityType.CATEGORY,
    entityIdFromResponse: 'id',
  })
  @ApiOperation({
    summary: 'Create category',
    description: 'Creates a new product category',
    operationId: 'createCategory',
  })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  async createCategory(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.create(createCategoryDto);
  }

  @Put(':id')
  @RequirePermission(Resource.PRODUCTS, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @CategoryHateoas()
  @Auditable({
    action: AuditAction.UPDATE,
    entityType: AuditEntityType.CATEGORY,
    entityIdParam: 'id',
  })
  @ApiOperation({
    summary: 'Update category',
    description: 'Updates an existing product category',
    operationId: 'updateCategory',
  })
  @ApiParam({
    name: 'id',
    description: 'Category UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @RequirePermission(Resource.PRODUCTS, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @DeleteCategoryHateoas()
  @Auditable({
    action: AuditAction.DELETE,
    entityType: AuditEntityType.CATEGORY,
    entityIdParam: 'id',
  })
  @ApiOperation({
    summary: 'Delete category',
    description: 'Deletes a product category',
    operationId: 'deleteCategory',
  })
  @ApiParam({
    name: 'id',
    description: 'Category UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid UUID format',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  async deleteCategory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    await this.categoriesService.delete(id);
    return { message: 'Category deleted successfully' };
  }
}
