import { Layer } from 'effect';
import {
  StockMovementsRepository,
  makeStockMovementsRepository,
} from './repository';
import { StockMovementsService, makeStockMovementsService } from './service';

export const stockMovementsRepositoryLayer = Layer.effect(
  StockMovementsRepository,
  makeStockMovementsRepository,
);

export const stockMovementsLayer = Layer.effect(
  StockMovementsService,
  makeStockMovementsService,
).pipe(Layer.provide(stockMovementsRepositoryLayer));
