import { Layer } from 'effect';
import {
  makeOrderItemsRepository,
  makeOrdersRepository,
  OrderItemsRepository,
  OrdersRepository,
} from './repository';
import { makeOrdersService, OrdersService } from './service';

export const ordersRepositoryLayer = Layer.mergeAll(
  Layer.effect(OrdersRepository, makeOrdersRepository),
  Layer.effect(OrderItemsRepository, makeOrderItemsRepository),
);

export const ordersLayer = Layer.effect(
  OrdersService,
  makeOrdersService,
).pipe(Layer.provide(ordersRepositoryLayer));
