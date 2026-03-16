import { Effect } from 'effect';
import type { Schema } from 'effect';
import type { Inventory } from './entities/inventory.entity';
import type {
  AdjustInventorySchema,
  CreateInventorySchema,
  InventoryQuerySchema,
  UpdateInventorySchema,
} from './inventory.schema';
import { toPaginatedResponse } from '../../platform/pagination.utils';
import {
  toInventoryResponseDto,
} from './inventory.utils';
import {
  InvalidInventoryArea,
  InvalidInventoryLocation,
  InvalidInventoryProduct,
  InventoryAlreadyExists,
  InventoryAreaLocationMismatch,
  InventoryInfrastructureError,
  InventoryLocationNotFound,
  InventoryNotFound,
  InventoryProductNotFound,
  InventoryQuantityAdjustmentFailed,
} from './inventory.errors';
import '@librestock/types/inventory';
import { AreaNotFound, AreasInfrastructureError } from '../areas/areas.errors';
import { ProductsService } from '../products/service';
import { LocationsService } from '../locations/service';
import { AreasService } from '../areas/service';
import { InventoryRepository } from './repository';

type InventoryQueryDto = Schema.Schema.Type<typeof InventoryQuerySchema>;
type CreateInventoryDto = Schema.Schema.Type<typeof CreateInventorySchema>;
type UpdateInventoryDto = Schema.Schema.Type<typeof UpdateInventorySchema>;
type AdjustInventoryDto = Schema.Schema.Type<typeof AdjustInventorySchema>;

export class InventoryService extends Effect.Service<InventoryService>()(
  '@librestock/effect/InventoryService',
  {
    effect: Effect.gen(function* () {
      const repository = yield* InventoryRepository;
      const productsService = yield* ProductsService;
      const locationsService = yield* LocationsService;
      const areasService = yield* AreasService;

      const getInventoryOrFail = (
        id: string,
      ): Effect.Effect<Inventory, InventoryInfrastructureError | InventoryNotFound> =>
        Effect.flatMap(
          repository.findById(id),
          (inventory) =>
            inventory
              ? Effect.succeed(inventory)
              : Effect.fail(
                  new InventoryNotFound({
                    id,
                    message: 'Inventory item not found',
                  }),
                ),
        );

      const ensureProductExists = (productId: string) =>
        Effect.flatMap(
          productsService.existsById(productId),
          (exists) =>
            exists
              ? Effect.void
              : Effect.fail(
                  new InvalidInventoryProduct({
                    productId,
                    message: 'Product not found',
                  }),
                ),
        );

      const ensureLocationExists = (locationId: string) =>
        Effect.flatMap(
          locationsService.existsById(locationId),
          (exists) =>
            exists
              ? Effect.void
              : Effect.fail(
                  new InvalidInventoryLocation({
                    locationId,
                    message: 'Location not found',
                  }),
                ),
        );

      const getAreaForLocation = (
        areaId: string,
        locationId: string,
      ): Effect.Effect<
        { id: string; location_id: string },
        InvalidInventoryArea | InventoryAreaLocationMismatch | InventoryInfrastructureError
      > =>
        Effect.flatMap(
          areasService.findById(areaId),
          (area) =>
            area.location_id === locationId
              ? Effect.succeed(area)
              : Effect.fail(
                  new InventoryAreaLocationMismatch({
                    areaId,
                    locationId,
                    message: 'Area must belong to the specified location',
                  }),
                ),
        ).pipe(
          Effect.mapError((error) => {
            if (error instanceof AreaNotFound || (error as { _tag?: string })._tag === 'AreaNotFound') {
              return new InvalidInventoryArea({
                areaId,
                message: 'Area not found',
              });
            }

            if (
              error instanceof AreasInfrastructureError ||
              (error as { _tag?: string })._tag === 'AreasInfrastructureError'
            ) {
              return new InventoryInfrastructureError({
                action: 'load inventory area',
                cause: error,
                message: 'Inventory service failed to load inventory area',
              });
            }

            return error;
          }),
        );

      const findAllPaginated = (query: InventoryQueryDto) =>
        Effect.map(
          repository.findAllPaginated(query),
          (result) => toPaginatedResponse(result, toInventoryResponseDto),
        );

      const findAll = () =>
        Effect.map(
          repository.findAll(),
          (inventoryItems) => inventoryItems.map(toInventoryResponseDto),
        );

      const findOne = (id: string) =>
        Effect.map(getInventoryOrFail(id), toInventoryResponseDto);

      const findByProduct = (productId: string) =>
        Effect.gen(function* () {
          const exists = yield* productsService.existsById(productId);
          if (!exists) {
            return yield* Effect.fail(
              new InventoryProductNotFound({
                productId,
                message: 'Product not found',
              }),
            );
          }

          const inventoryItems = yield* repository.findByProductId(productId);
          return inventoryItems.map(toInventoryResponseDto);
        });

      const findByLocation = (locationId: string) =>
        Effect.gen(function* () {
          const exists = yield* locationsService.existsById(locationId);
          if (!exists) {
            return yield* Effect.fail(
              new InventoryLocationNotFound({
                locationId,
                message: 'Location not found',
              }),
            );
          }

          const inventoryItems = yield* repository.findByLocationId(locationId);
          return inventoryItems.map(toInventoryResponseDto);
        });

      const create = (dto: CreateInventoryDto) =>
        Effect.gen(function* () {
          yield* ensureProductExists(dto.product_id);
          yield* ensureLocationExists(dto.location_id);

          if (dto.area_id) {
            yield* getAreaForLocation(dto.area_id, dto.location_id);
          }

          const existing = yield* repository.findByProductAndLocation(
            dto.product_id,
            dto.location_id,
            dto.area_id,
          );
          if (existing) {
            return yield* Effect.fail(
              new InventoryAlreadyExists({
                productId: dto.product_id,
                locationId: dto.location_id,
                areaId: dto.area_id,
                message:
                  'Inventory for this product at this location/area already exists. Use the update or adjust endpoint instead.',
              }),
            );
          }

          const inventory = yield* repository.create({
            product_id: dto.product_id,
            location_id: dto.location_id,
            area_id: dto.area_id ?? null,
            quantity: dto.quantity,
            batchNumber: dto.batchNumber ?? '',
            expiry_date: dto.expiry_date ?? null,
            cost_per_unit: dto.cost_per_unit ?? null,
            received_date: dto.received_date ?? null,
          });

          const inventoryWithRelations = yield* getInventoryOrFail(inventory.id);
          return toInventoryResponseDto(inventoryWithRelations);
        });

      const update = (id: string, dto: UpdateInventoryDto) =>
        Effect.gen(function* () {
          const inventory = yield* getInventoryOrFail(id);

          if (Object.keys(dto).length === 0) {
            return toInventoryResponseDto(inventory);
          }

          const newLocationId = dto.location_id ?? inventory.location_id;
          const newAreaId = dto.area_id !== undefined ? dto.area_id : inventory.area_id;

          if (dto.location_id && dto.location_id !== inventory.location_id) {
            yield* ensureLocationExists(dto.location_id);
          }

          if (newAreaId) {
            yield* getAreaForLocation(newAreaId, newLocationId);
          }

          const locationChanged =
            dto.location_id !== undefined && dto.location_id !== inventory.location_id;
          const areaChanged = dto.area_id !== undefined && dto.area_id !== inventory.area_id;

          if (locationChanged || areaChanged) {
            const existing = yield* repository.findByProductAndLocation(
              inventory.product_id,
              newLocationId,
              newAreaId,
            );

            if (existing && existing.id !== id) {
              return yield* Effect.fail(
                new InventoryAlreadyExists({
                  productId: inventory.product_id,
                  locationId: newLocationId,
                  areaId: newAreaId,
                  message:
                    'Inventory for this product at this location/area already exists. Use the update or adjust endpoint instead.',
                }),
              );
            }
          }

          const updateData: Partial<Inventory> = {};
          if (dto.location_id !== undefined) {
            updateData.location_id = dto.location_id;
          }
          if (dto.area_id !== undefined) {
            updateData.area_id = dto.area_id;
          }
          if (dto.quantity !== undefined) {
            updateData.quantity = dto.quantity;
          }
          if (dto.batchNumber !== undefined) {
            updateData.batchNumber = dto.batchNumber;
          }
          if (dto.expiry_date !== undefined) {
            updateData.expiry_date = dto.expiry_date;
          }
          if (dto.cost_per_unit !== undefined) {
            updateData.cost_per_unit = dto.cost_per_unit;
          }
          if (dto.received_date !== undefined) {
            updateData.received_date = dto.received_date;
          }

          yield* repository.update(id, updateData);

          const updatedInventory = yield* getInventoryOrFail(id);
          return toInventoryResponseDto(updatedInventory);
        });

      const adjustQuantity = (id: string, dto: AdjustInventoryDto) =>
        Effect.gen(function* () {
          yield* getInventoryOrFail(id);

          const affected = yield* repository.adjustQuantity(id, dto.adjustment);
          if (affected === 0) {
            return yield* Effect.fail(
              new InventoryQuantityAdjustmentFailed({
                id,
                adjustment: dto.adjustment,
                message: 'Inventory quantity adjustment would result in a negative quantity',
              }),
            );
          }

          const updatedInventory = yield* getInventoryOrFail(id);
          return toInventoryResponseDto(updatedInventory);
        });

      const remove = (id: string) =>
        Effect.gen(function* () {
          yield* getInventoryOrFail(id);
          yield* repository.delete(id);
        });

      return {
        findAllPaginated,
        findAll,
        findOne,
        findByProduct,
        findByLocation,
        create,
        update,
        adjustQuantity,
        delete: remove,
      };
    }),
    dependencies: [InventoryRepository.Default, ProductsService.Default, LocationsService.Default, AreasService.Default],
  },
) {}
