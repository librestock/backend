import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { LocationsModule } from '../locations/locations.module';
import { AreasModule } from '../areas/areas.module';
import { Inventory } from './entities/inventory.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory]),
    ProductsModule,
    LocationsModule,
    forwardRef(() => AreasModule),
  ],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository],
  exports: [InventoryService],
})
export class InventoryModule {}
