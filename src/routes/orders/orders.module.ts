import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '../clients/clients.module';
import { ProductsModule } from '../products/products.module';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderRepository } from './orders.repository';
import { OrderItemRepository } from './order-items.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    ClientsModule,
    ProductsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderRepository, OrderItemRepository],
  exports: [OrdersService],
})
export class OrdersModule {}
