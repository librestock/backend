import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandingSettings } from './entities/branding.entity';
import { BrandingRepository } from './branding.repository';
import { BrandingService } from './branding.service';
import { BrandingController } from './branding.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BrandingSettings])],
  controllers: [BrandingController],
  providers: [BrandingRepository, BrandingService],
  exports: [BrandingService],
})
export class BrandingModule {}
