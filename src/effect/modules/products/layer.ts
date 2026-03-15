import { Layer } from 'effect';
import { ProductsRepository, makeProductsRepository } from './repository';
import { ProductsService, makeProductsService } from './service';

export const productsRepositoryLayer = Layer.effect(
  ProductsRepository,
  makeProductsRepository,
);

export const productsLayer = Layer.effect(
  ProductsService,
  makeProductsService,
).pipe(Layer.provide(productsRepositoryLayer));
