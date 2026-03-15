import { Layer } from 'effect';
import { InventoryRepository, makeInventoryRepository } from './repository';
import { InventoryService, makeInventoryService } from './service';

export const inventoryRepositoryLayer = Layer.effect(
  InventoryRepository,
  makeInventoryRepository,
);

export const inventoryLayer = Layer.effect(
  InventoryService,
  makeInventoryService,
).pipe(Layer.provide(inventoryRepositoryLayer));
