import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { ProductsModule } from '../products/products.module';
import { LocationsModule } from '../locations/locations.module';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';
import { StockMovementRepository } from './stock-movement.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockMovement]),
    ProductsModule,
    LocationsModule,
  ],
  controllers: [StockMovementsController],
  providers: [StockMovementsService, StockMovementRepository, PermissionGuard],
  exports: [StockMovementsService],
})
export class StockMovementsModule {}
