import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  ParseEnumPipe,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { AuditEntityType, Resource, Permission } from '@librestock/types';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { RequirePermission } from '../../common/decorators';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { AuditLogService } from './audit-log.service';
import {
  AuditLogQueryDto,
  AuditLogResponseDto,
  PaginatedAuditLogsResponseDto,
} from './dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(PermissionGuard)
@RequirePermission(Resource.AUDIT_LOGS, Permission.READ)
@Controller()
export class AuditLogsController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({
    summary: 'List audit logs with pagination and filtering',
    operationId: 'listAuditLogs',
  })
  @ApiResponse({ status: 200, type: PaginatedAuditLogsResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async listAuditLogs(
    @Query() query: AuditLogQueryDto,
  ): Promise<PaginatedAuditLogsResponseDto> {
    const result = await this.auditLogService.query({
      entity_type: query.entity_type,
      entity_id: query.entity_id,
      user_id: query.user_id,
      action: query.action,
      from_date: query.from_date ? new Date(query.from_date) : undefined,
      to_date: query.to_date ? new Date(query.to_date) : undefined,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: result.data,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: result.total_pages,
        has_next: result.page < result.total_pages,
        has_previous: result.page > 1,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID', operationId: 'getAuditLog' })
  @ApiParam({ name: 'id', description: 'Audit log UUID', type: String })
  @ApiResponse({ status: 200, type: AuditLogResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getAuditLog(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditLogResponseDto> {
    const auditLog = await this.auditLogService.findById(id);
    if (!auditLog) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }
    return auditLog;
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({
    summary: 'Get audit history for a specific entity',
    operationId: 'getEntityAuditHistory',
  })
  @ApiParam({
    name: 'entityType',
    description: 'Entity type',
    enum: AuditEntityType,
  })
  @ApiParam({ name: 'entityId', description: 'Entity UUID', type: String })
  @ApiResponse({ status: 200, type: [AuditLogResponseDto] })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async getEntityAuditHistory(
    @Param('entityType', new ParseEnumPipe(AuditEntityType)) entityType: AuditEntityType,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditLogService.getEntityHistory(entityType, entityId);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get audit history for a specific user',
    operationId: 'getUserAuditHistory',
  })
  @ApiParam({ name: 'userId', description: 'User UUID', type: String })
  @ApiResponse({ status: 200, type: [AuditLogResponseDto] })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async getUserAuditHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditLogService.getUserHistory(userId);
  }
}
