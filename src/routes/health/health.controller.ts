import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { BetterAuthHealthIndicator } from './indicators/better-auth-health.indicator';

@ApiTags('Health')
@Controller()
@SkipThrottle()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private betterAuth: BetterAuthHealthIndicator,
  ) {}

  @Get('health-check')
  @AllowAnonymous()
  @HealthCheck()
  @ApiOperation({
    summary: 'Full health check',
    description:
      'Comprehensive health check including database and Better Auth configuration',
    operationId: 'healthCheck',
  })
  @ApiResponse({
    status: 200,
    description: 'All systems healthy',
  })
  @ApiResponse({
    status: 503,
    description: 'One or more systems unhealthy',
  })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.betterAuth.isHealthy('better-auth'),
    ]);
  }

  @Get('health-check/live')
  @AllowAnonymous()
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Kubernetes liveness probe - returns 200 if application is running',
    operationId: 'liveness',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
  })
  liveness() {
    return this.health.check([]);
  }

  @Get('health-check/ready')
  @AllowAnonymous()
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Kubernetes readiness probe - returns 200 if application is ready to serve traffic',
    operationId: 'readiness',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready',
  })
  readiness() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
