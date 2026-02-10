import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { Resource, Permission, AuditAction, AuditEntityType } from '@librestock/types';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from './dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(PermissionGuard)
@RequirePermission(Resource.ROLES, Permission.READ)
@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List all roles', operationId: 'listRoles' })
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  async listRoles(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID', operationId: 'getRole' })
  @ApiParam({ name: 'id', description: 'Role UUID', type: String })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getRole(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoleResponseDto> {
    return this.rolesService.findById(id);
  }

  @Post()
  @RequirePermission(Resource.ROLES, Permission.WRITE)
  @Auditable({
    action: AuditAction.CREATE,
    entityType: AuditEntityType.ROLE,
    entityIdFromResponse: 'id',
  })
  @ApiOperation({ summary: 'Create a role', operationId: 'createRole' })
  @ApiResponse({ status: 201, type: RoleResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  async createRole(@Body() dto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.rolesService.create(dto);
  }

  @Put(':id')
  @RequirePermission(Resource.ROLES, Permission.WRITE)
  @Auditable({
    action: AuditAction.UPDATE,
    entityType: AuditEntityType.ROLE,
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Update a role', operationId: 'updateRole' })
  @ApiParam({ name: 'id', description: 'Role UUID', type: String })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(Resource.ROLES, Permission.WRITE)
  @Auditable({
    action: AuditAction.DELETE,
    entityType: AuditEntityType.ROLE,
    entityIdParam: 'id',
  })
  @ApiOperation({ summary: 'Delete a role', operationId: 'deleteRole' })
  @ApiParam({ name: 'id', description: 'Role UUID', type: String })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async deleteRole(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.rolesService.delete(id);
  }
}
