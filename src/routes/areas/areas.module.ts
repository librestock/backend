import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationsModule } from '../locations/locations.module';
import { Area } from './entities/area.entity';
import { AreaRepository } from './area.repository';
import { AreasService } from './areas.service';
import { AreasController } from './areas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Area]), LocationsModule],
  controllers: [AreasController],
  providers: [AreasService, AreaRepository],
  exports: [AreasService],
})
export class AreasModule {}
