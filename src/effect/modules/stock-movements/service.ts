import { Context, Effect } from 'effect';
import type { Schema } from 'effect';
import type { StockMovement } from './entities/stock-movement.entity';
import type {
  CreateStockMovementSchema,
  StockMovementQuerySchema,
} from './stock-movements.schema';
import { toPaginatedResponse } from '../../platform/pagination.utils';
import {
  stockMovementTryAsync,
  toStockMovementResponseDto,
} from './stock-movements.utils';
import {
  InvalidDestinationLocation,
  InvalidSourceLocation,
  InvalidStockMovementProduct,
  StockMovementLocationNotFound,
  StockMovementNotFound,
  StockMovementProductNotFound,
  StockMovementsInfrastructureError,
} from './stock-movements.errors';
import type {
  PaginatedStockMovementsResponseDto,
  StockMovementResponseDto,
} from '@librestock/types/stock-movements';
import { ProductsService } from '../products/service';
import { LocationsService } from '../locations/service';
import { StockMovementsRepository } from './repository';

type StockMovementQueryDto = Schema.Schema.Type<typeof StockMovementQuerySchema>;
type CreateStockMovementDto = Schema.Schema.Type<typeof CreateStockMovementSchema>;

export interface StockMovementsService {
  readonly findAllPaginated: (
    query: StockMovementQueryDto,
  ) => Effect.Effect<
    PaginatedStockMovementsResponseDto,
    StockMovementsInfrastructureError
  >;
  readonly findOne: (
    id: string,
  ) => Effect.Effect<
    StockMovementResponseDto,
    StockMovementNotFound | StockMovementsInfrastructureError
  >;
  readonly findByProduct: (
    productId: string,
  ) => Effect.Effect<
    StockMovementResponseDto[],
    StockMovementProductNotFound | StockMovementsInfrastructureError
  >;
  readonly findByLocation: (
    locationId: string,
  ) => Effect.Effect<
    StockMovementResponseDto[],
    StockMovementLocationNotFound | StockMovementsInfrastructureError
  >;
  readonly create: (
    dto: CreateStockMovementDto,
    userId: string,
  ) => Effect.Effect<
    StockMovementResponseDto,
    | InvalidDestinationLocation
    | InvalidSourceLocation
    | InvalidStockMovementProduct
    | StockMovementNotFound
    | StockMovementsInfrastructureError
  >;
}

export const StockMovementsService = Context.GenericTag<StockMovementsService>(
  '@librestock/effect/StockMovementsService',
);

export const makeStockMovementsService = Effect.gen(function* () {
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
      stockMovementTryAsync('load stock movement', () => repository.findById(id)),
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

  return {
    findAllPaginated: (query) =>
      Effect.map(
        stockMovementTryAsync('list stock movements', () =>
          repository.findAllPaginated(query),
        ),
        (result) => toPaginatedResponse(result, toStockMovementResponseDto),
      ),
    findOne: (id) =>
      Effect.map(getMovementOrFail(id), toStockMovementResponseDto),
    findByProduct: (productId) =>
      Effect.gen(function* () {
        const exists = yield* stockMovementTryAsync('check product existence', () =>
          productsService.existsById(productId),
        );
        if (!exists) {
          return yield* Effect.fail(
            new StockMovementProductNotFound({
              productId,
              message: 'Product not found',
            }),
          );
        }

        const stockMovements = yield* stockMovementTryAsync(
          'list stock movements by product',
          () => repository.findByProductId(productId),
        );
        return stockMovements.map(toStockMovementResponseDto);
      }),
    findByLocation: (locationId) =>
      Effect.gen(function* () {
        const exists = yield* stockMovementTryAsync('check location existence', () =>
          locationsService.existsById(locationId),
        );
        if (!exists) {
          return yield* Effect.fail(
            new StockMovementLocationNotFound({
              locationId,
              message: 'Location not found',
            }),
          );
        }

        const stockMovements = yield* stockMovementTryAsync(
          'list stock movements by location',
          () => repository.findByLocationId(locationId),
        );
        return stockMovements.map(toStockMovementResponseDto);
      }),
    create: (dto, userId) =>
      Effect.gen(function* () {
        const productExists = yield* stockMovementTryAsync(
          'check product existence',
          () => productsService.existsById(dto.product_id),
        );
        if (!productExists) {
          return yield* Effect.fail(
            new InvalidStockMovementProduct({
              productId: dto.product_id,
              message: 'Product not found',
            }),
          );
        }

        if (dto.from_location_id) {
          const fromLocationExists = yield* stockMovementTryAsync(
            'check source location existence',
            () => locationsService.existsById(dto.from_location_id!),
          );
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
          const toLocationExists = yield* stockMovementTryAsync(
            'check destination location existence',
            () => locationsService.existsById(dto.to_location_id!),
          );
          if (!toLocationExists) {
            return yield* Effect.fail(
              new InvalidDestinationLocation({
                locationId: dto.to_location_id,
                message: 'Destination location not found',
              }),
            );
          }
        }

        const stockMovement = yield* stockMovementTryAsync(
          'create stock movement',
          () =>
            repository.create({
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
            }),
        );

        const stockMovementWithRelations = yield* getMovementOrFail(stockMovement.id);
        return toStockMovementResponseDto(stockMovementWithRelations);
      }),
  } satisfies StockMovementsService;
});
