import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { AuthThrottle } from 'src/common/decorators/throttle.decorator';
import { ErrorResponseDto } from 'src/common/dto/error-response.dto';
import {
  getSessionIdFromSession,
  getSessionTimingFromSession,
  getUserIdFromSession,
} from 'src/common/auth/session';
import { RolesService } from '../roles/roles.service';
import { CurrentUserResponseDto } from './dto/current-user-response.dto';
import { SessionClaimsResponseDto } from './dto/session-claims-response.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

@ApiTags('Auth')
@ApiBearerAuth()
@AuthThrottle()
@Controller()
export class AuthController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user with roles and permissions',
    description: 'Retrieves the current user profile including assigned roles and resolved permissions',
    operationId: 'getCurrentUser',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user retrieved successfully',
    type: CurrentUserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  async me(
    @Session() session: UserSession,
  ): Promise<CurrentUserResponseDto> {
    const { id, name, email, image } = session.user;
    const { roleNames, permissions } =
      await this.rolesService.getPermissionsForUser(id);
    return {
      id,
      name,
      email,
      image: image ?? undefined,
      roles: roleNames,
      permissions,
    };
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieves the current user profile from Better Auth',
    operationId: 'getProfile',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: ProfileResponseDto,
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
  getProfile(
    @Session() session: UserSession,
  ): ProfileResponseDto {
    const { id, name, email, image, createdAt, updatedAt } = session.user;
    return {
      id,
      name,
      email,
      image: image ?? undefined,
      createdAt: createdAt instanceof Date ? createdAt.toISOString() : String(createdAt),
      updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : String(updatedAt),
    };
  }

  @Get('session-claims')
  @ApiOperation({
    summary: 'Get session claims',
    description: 'Retrieves the current session JWT claims',
    operationId: 'getSessionClaims',
  })
  @ApiResponse({
    status: 200,
    description: 'Session claims retrieved successfully',
    type: SessionClaimsResponseDto,
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
  getSessionClaims(
    @Session() session: UserSession,
  ): SessionClaimsResponseDto {
    const { issuedAt, expiresAt } = getSessionTimingFromSession(session);
    return {
      user_id: getUserIdFromSession(session) ?? '',
      session_id: getSessionIdFromSession(session) ?? '',
      expires_at: expiresAt ?? 0,
      issued_at: issuedAt ?? 0,
    };
  }
}
