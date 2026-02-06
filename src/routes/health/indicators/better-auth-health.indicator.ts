import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';

/**
 * Custom health indicator for Better Auth configuration.
 */
@Injectable()
export class BetterAuthHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  isHealthy(key: string): HealthIndicatorResult {
    const authSecret = this.configService.get<string>('BETTER_AUTH_SECRET');

    if (!authSecret) {
      const result = this.getStatus(key, false, {
        message: 'BETTER_AUTH_SECRET is not configured',
      });
      throw new HealthCheckError('Better Auth configuration check failed', result);
    }

    return this.getStatus(key, true, {
      message: 'Better Auth is properly configured',
    });
  }
}
