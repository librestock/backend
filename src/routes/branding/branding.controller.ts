import { Controller, Get, Put, Body, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AllowAnonymous, Session, UserSession } from '@thallesp/nestjs-better-auth';
import { Resource, Permission } from '@librestock/types';
import { StandardThrottle } from 'src/common/decorators/throttle.decorator';
import { RequirePermission } from 'src/common/decorators';
import { PermissionGuard } from 'src/common/guards/permission.guard';
import { getUserIdFromSession } from 'src/common/auth/session';
import { BrandingService } from './branding.service';
import { BrandingResponseDto } from './dto/branding-response.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';

@ApiTags('Branding')
@Controller()
@StandardThrottle()
export class BrandingController {
  constructor(private readonly service: BrandingService) {}

  @Get()
  @AllowAnonymous()
  @ApiOperation({ summary: 'Get branding settings (public)' })
  @ApiResponse({ status: 200, description: 'Branding settings', type: BrandingResponseDto })
  async get(): Promise<BrandingResponseDto> {
    return this.service.get();
  }

  @Put()
  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @RequirePermission(Resource.SETTINGS, Permission.WRITE)
  @ApiOperation({ summary: 'Update branding settings' })
  @ApiResponse({ status: 200, description: 'Updated branding settings', type: BrandingResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async update(
    @Body() dto: UpdateBrandingDto,
    @Session() session: UserSession,
  ): Promise<BrandingResponseDto> {
    const userId = getUserIdFromSession(session);
    if (!userId) {
      throw new UnauthorizedException('Session user not available');
    }
    return this.service.update(dto, userId);
  }
}
