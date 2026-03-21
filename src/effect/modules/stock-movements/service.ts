import { Effect } from 'effect';
import type { Schema } from 'effect';
import type { StockMovementQueryDto } from '@librestock/types/stock-movements';
import { toPaginatedResponse } from '../../platform/pagination.utils';
import { ProductsService } from '../products/service';
import { LocationsService } from '../locations/service';
import type { StockMovement } from './entities/stock-movement.entity';
import type { CreateStockMovementSchema } from './stock-movements.schema';
import {
  toStockMovementResponseDto,
} from './stock-movements.utils';
import {
  InvalidDestinationLocation,
  InvalidSourceLocation,
  InvalidStockMovementProduct,
  StockMovementLocationNotFound,
  StockMovementNotFound,
  StockMovementProductNotFound,
  type StockMovementsInfrastructureError,
} from './stock-movements.errors';
import { StockMovementsRepository } from './repository';

type CreateStockMovementDto = Schema.Schema.Type<typeof CreateStockMovementSchema>;

export class StockMovementsService extends Effect.Service<StockMovementsService>()(
  '@librestock/effect/StockMovementsService',
  {
    effect: Effect.gen(function* () {
      const repository = yield* StockMovementsRepository;
      const productsService = yield* ProductsService;
      const locationsService = yield* LocationsService;

      const getMovementOrFail = (
        id: string,
      ): Effect.Effect<
        StockMovement,
        StockMovementNotFound | StockMovementsInfrastructureError
      > =>
        Effect.flatMap(
          repository.findById(id),
          (stockMovement) =>
            stockMovement
              ? Effect.succeed(stockMovement)
              : Effect.fail(
                  new StockMovementNotFound({
                    id,
                    message: 'Stock movement not found',
                  }),
                ),
        );

      const findAllPaginated = (query: StockMovementQueryDto) =>
        Effect.map(
          repository.findAllPaginated(query),
          (result) => toPaginatedResponse(result, toStockMovementResponseDto),
        );

      const findOne = (id: string) =>
        Effect.map(getMovementOrFail(id), toStockMovementResponseDto);

      const findByProduct = (productId: string) =>
        Effect.gen(function* () {
          const exists = yield* productsService.existsById(productId);
          if (!exists) {
            return yield* Effect.fail(
              new StockMovementProductNotFound({
                productId,
                message: 'Product not found',
              }),
            );
          }

          const stockMovements = yield* repository.findByProductId(productId);
          return stockMovements.map(toStockMovementResponseDto);
        });

      const findByLocation = (locationId: string) =>
        Effect.gen(function* () {
          const exists = yield* locationsService.existsById(locationId);
          if (!exists) {
            return yield* Effect.fail(
              new StockMovementLocationNotFound({
                locationId,
                message: 'Location not found',
              }),
            );
          }

          const stockMovements = yield* repository.findByLocationId(locationId);
          return stockMovements.map(toStockMovementResponseDto);
        });

      const create = (dto: CreateStockMovementDto, userId: string) =>
        Effect.gen(function* () {
          const productExists = yield* productsService.existsById(dto.product_id);
          if (!productExists) {
            return yield* Effect.fail(
              new InvalidStockMovementProduct({
                productId: dto.product_id,
                message: 'Product not found',
              }),
            );
          }

          if (dto.from_location_id) {
            const fromLocationExists = yield* locationsService.existsById(dto.from_location_id);
            if (!fromLocationExists) {
              return yield* Effect.fail(
                new InvalidSourceLocation({
                  locationId: dto.from_location_id,
                  message: 'Source location not found',
                }),
              );
            }
          }

          if (dto.to_location_id) {
            const toLocationExists = yield* locationsService.existsById(dto.to_location_id);
            if (!toLocationExists) {
              return yield* Effect.fail(
                new InvalidDestinationLocation({
                  locationId: dto.to_location_id,
                  message: 'Destination location not found',
                }),
              );
            }
          }

          const stockMovement = yield* repository.create({
            product_id: dto.product_id,
            from_location_id: dto.from_location_id ?? null,
            to_location_id: dto.to_location_id ?? null,
            quantity: dto.quantity,
            reason: dto.reason,
            order_id: dto.order_id ?? null,
            reference_number: dto.reference_number ?? null,
            cost_per_unit: dto.cost_per_unit ?? null,
            notes: dto.notes ?? null,
            user_id: userId,
          });

          const stockMovementWithRelations = yield* getMovementOrFail(stockMovement.id);
          return toStockMovementResponseDto(stockMovementWithRelations);
        });

      return {
        findAllPaginated,
        findOne,
        findByProduct,
        findByLocation,
        create,
      };
    }),
    dependencies: [StockMovementsRepository.Default, ProductsService.Default, LocationsService.Default],
  },
) {}
