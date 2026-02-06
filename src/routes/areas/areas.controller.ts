import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { HateoasInterceptor } from '../../common/hateoas/hateoas.interceptor';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Auditable } from '../../common/decorators/auditable.decorator';
import { AuditAction, AuditEntityType } from '../../common/enums';
import { StandardThrottle } from '../../common/decorators/throttle.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { AreaQueryDto } from './dto/area-query.dto';
import { AreaResponseDto } from './dto/area-response.dto';
import { AreaHateoas, AreaListHateoas } from './areas.hateoas';

@ApiTags('Areas')
@ApiBearerAuth('BearerAuth')
@StandardThrottle()
@Controller()
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Post()
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @AreaHateoas()
  @Auditable({
    action: AuditAction.CREATE,
    entityType: AuditEntityType.AREA,
    entityIdFromResponse: 'id',
  })
  @ApiOperation({ summary: 'Create a new area' })
  @ApiResponse({
    status: 201,
    description: 'Area created successfully',
    type: AreaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
    type: ErrorResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateAreaDto): Promise<AreaResponseDto> {
    const area = await this.areasService.create(dto);
    return area;
  }

  @Get()
  @UseInterceptors(HateoasInterceptor)
  @AreaListHateoas()
  @ApiOperation({ summary: 'List areas with optional filtering' })
  @ApiResponse({
    status: 200,
    description: 'List of areas',
    type: [AreaResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: AreaQueryDto): Promise<AreaResponseDto[]> {
    const areas = await this.areasService.findAll(query);
    return areas;
  }

  @Get(':id')
  @UseInterceptors(HateoasInterceptor)
  @AreaHateoas()
  @ApiOperation({ summary: 'Get area by ID' })
  @ApiParam({ name: 'id', description: 'Area ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Area found',
    type: AreaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Area not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AreaResponseDto> {
    const area = await this.areasService.findById(id);
    return area;
  }

  @Get(':id/children')
  @UseInterceptors(HateoasInterceptor)
  @AreaHateoas()
  @ApiOperation({ summary: 'Get area with children' })
  @ApiParam({ name: 'id', description: 'Area ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Area with children',
    type: AreaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Area not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByIdWithChildren(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AreaResponseDto> {
    const area = await this.areasService.findByIdWithChildren(id);
    return area;
  }

  @Put(':id')
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @AreaHateoas()
  @Auditable({
    action: AuditAction.UPDATE,
    entityType: AuditEntityType.AREA,
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Update an area' })
  @ApiParam({ name: 'id', description: 'Area ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Area updated successfully',
    type: AreaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Area not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAreaDto,
  ): Promise<AreaResponseDto> {
    const area = await this.areasService.update(id, dto);
    return area;
  }

  @Delete(':id')
  @UseInterceptors(AuditInterceptor)
  @Auditable({
    action: AuditAction.DELETE,
    entityType: AuditEntityType.AREA,
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Delete an area' })
  @ApiParam({ name: 'id', description: 'Area ID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Area deleted successfully' })
  @ApiResponse({
    status: 404,
    description: 'Area not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.areasService.delete(id);
    return { message: 'Area deleted successfully' };
  }
}
