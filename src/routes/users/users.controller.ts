import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums';
import { toPaginationMeta } from '../../common/utils/pagination.utils';
import { UsersService } from './users.service';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { BanUserDto } from './dto/ban-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with pagination and search', operationId: 'listUsers' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  async listUsers(@Query() query: UserQueryDto, @Req() req: Request) {
    const result = await this.usersService.listUsers(query, req.headers);
    return {
      data: result.data,
      meta: toPaginationMeta(result.total, result.page, result.limit),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID', operationId: 'getUser' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getUser(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request): Promise<UserResponseDto> {
    return this.usersService.getUser(id, req.headers);
  }

  @Put(':id/roles')
  @ApiOperation({ summary: 'Set user roles', operationId: 'updateUserRoles' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async updateRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRolesDto,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    return this.usersService.updateRoles(id, dto.roles, req.headers);
  }

  @Patch(':id/ban')
  @ApiOperation({ summary: 'Ban a user', operationId: 'banUser' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async banUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BanUserDto,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    return this.usersService.banUser(id, dto, req.headers);
  }

  @Patch(':id/unban')
  @ApiOperation({ summary: 'Unban a user', operationId: 'unbanUser' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async unbanUser(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request): Promise<UserResponseDto> {
    return this.usersService.unbanUser(id, req.headers);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user', operationId: 'deleteUser' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async deleteUser(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request): Promise<void> {
    return this.usersService.deleteUser(id, req.headers);
  }

  @Post(':id/revoke-sessions')
  @ApiOperation({ summary: 'Revoke all sessions for a user', operationId: 'revokeUserSessions' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({ status: 200, description: 'Sessions revoked' })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async revokeSessions(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request): Promise<void> {
    return this.usersService.revokeSessions(id, req.headers);
  }
}
