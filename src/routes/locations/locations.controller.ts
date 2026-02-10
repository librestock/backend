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
  CreateLocationDto,
  UpdateLocationDto,
  LocationResponseDto,
  LocationQueryDto,
  PaginatedLocationsResponseDto,
} from './dto';
import { LocationsService } from './locations.service';
import { LocationHateoas, DeleteLocationHateoas } from './locations.hateoas';

@ApiTags('Locations')
@ApiBearerAuth()
@StandardThrottle()
@UseGuards(PermissionGuard)
@RequirePermission(Resource.LOCATIONS, Permission.READ)
@Controller()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @UseInterceptors(HateoasInterceptor)
  @LocationHateoas()
  @ApiOperation({
    summary: 'List locations with pagination and filtering',
    operationId: 'listLocations',
  })
  @ApiResponse({ status: 200, type: PaginatedLocationsResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async listLocations(
    @Query() query: LocationQueryDto,
  ): Promise<PaginatedLocationsResponseDto> {
    return this.locationsService.findAllPaginated(query);
  }

  @Get('all')
  @UseInterceptors(HateoasInterceptor)
  @LocationHateoas()
  @ApiOperation({
    summary: 'List all locations without pagination',
    operationId: 'listAllLocations',
  })
  @ApiResponse({ status: 200, type: [LocationResponseDto] })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async listAllLocations(): Promise<LocationResponseDto[]> {
    return this.locationsService.findAll();
  }

  @Get(':id')
  @UseInterceptors(HateoasInterceptor)
  @LocationHateoas()
  @ApiOperation({ summary: 'Get location by ID', operationId: 'getLocation' })
  @ApiParam({ name: 'id', description: 'Location UUID', type: String })
  @ApiResponse({ status: 200, type: LocationResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getLocation(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LocationResponseDto> {
    return this.locationsService.findOne(id);
  }

  @Post()
  @RequirePermission(Resource.LOCATIONS, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @LocationHateoas()
  @Auditable({
    action: AuditAction.CREATE,
    entityType: AuditEntityType.LOCATION,
    entityIdFromResponse: 'id',
  })
  @ApiOperation({ summary: 'Create location', operationId: 'createLocation' })
  @ApiResponse({ status: 201, type: LocationResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async createLocation(
    @Body() createLocationDto: CreateLocationDto,
  ): Promise<LocationResponseDto> {
    return this.locationsService.create(createLocationDto);
  }

  @Put(':id')
  @RequirePermission(Resource.LOCATIONS, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @LocationHateoas()
  @Auditable({
    action: AuditAction.UPDATE,
    entityType: AuditEntityType.LOCATION,
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Update location', operationId: 'updateLocation' })
  @ApiParam({ name: 'id', description: 'Location UUID', type: String })
  @ApiResponse({ status: 200, type: LocationResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async updateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ): Promise<LocationResponseDto> {
    return this.locationsService.update(id, updateLocationDto);
  }

  @Delete(':id')
  @RequirePermission(Resource.LOCATIONS, Permission.WRITE)
  @UseInterceptors(HateoasInterceptor, AuditInterceptor)
  @DeleteLocationHateoas()
  @Auditable({
    action: AuditAction.DELETE,
    entityType: AuditEntityType.LOCATION,
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Delete location', operationId: 'deleteLocation' })
  @ApiParam({ name: 'id', description: 'Location UUID', type: String })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async deleteLocation(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    await this.locationsService.delete(id);
    return { message: 'Location deleted successfully' };
  }
}
