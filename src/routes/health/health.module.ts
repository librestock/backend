import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { BetterAuthHealthIndicator } from './indicators/better-auth-health.indicator';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [BetterAuthHealthIndicator],
})
export class HealthModule {}
