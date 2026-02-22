import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { Supplier } from './entities/supplier.entity';
import { SupplierProduct } from './entities/supplier-product.entity';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SupplierRepository } from './suppliers.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, SupplierProduct])],
  controllers: [SuppliersController],
  providers: [SuppliersService, SupplierRepository, PermissionGuard],
  exports: [SuppliersService],
})
export class SuppliersModule {}
