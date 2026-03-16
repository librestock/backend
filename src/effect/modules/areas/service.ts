import { Effect } from 'effect';
import type {
  AreaResponseDto,
  CreateAreaDto,
  UpdateAreaDto,
  AreaQueryDto,
} from '@librestock/types/areas';
import { toAreaResponseDto } from './areas.utils';
import {
  AreaCircularReference,
  AreaLocationNotFound,
  AreaNotFound,
  AreaParentLocationMismatch,
  AreasInfrastructureError,
  AreaSelfParent,
  ParentAreaNotFound,
} from './areas.errors';
import { AreasRepository } from './repository';
import { LocationsService } from '../locations/service';
import type { Area } from './entities/area.entity';

export class AreasService extends Effect.Service<AreasService>()(
  '@librestock/effect/AreasService',
  {
    effect: Effect.gen(function* () {
      const repository = yield* AreasRepository;
      const locationsService = yield* LocationsService;

      const getAreaOrFail = (id: string) =>
        Effect.flatMap(repository.findById(id), (area) =>
          area
            ? Effect.succeed(area)
            : Effect.fail(
                new AreaNotFound({
                  id,
                  message: `Area with ID ${id} not found`,
                }),
              ),
        );

      const wouldCreateCircularReference = (
        areaId: string,
        newParentId: string,
      ): Effect.Effect<boolean, AreasInfrastructureError> =>
        Effect.gen(function* () {
          let currentId: string | null = newParentId;

          while (currentId) {
            if (currentId === areaId) {
              return true;
            }
            const parent: Area | null = yield* repository.findById(currentId);
            currentId = parent?.parent_id ?? null;
          }

          return false;
        });

      const create = (dto: CreateAreaDto) =>
        Effect.gen(function* () {
          const locationExists = yield* locationsService.existsById(dto.location_id);
          if (!locationExists) {
            return yield* Effect.fail(
              new AreaLocationNotFound({
                locationId: dto.location_id,
                message: `Location with ID ${dto.location_id} not found`,
              }),
            );
          }

          if (dto.parent_id) {
            const parentArea = yield* repository.findById(dto.parent_id);
            if (!parentArea) {
              return yield* Effect.fail(
                new ParentAreaNotFound({
                  parentId: dto.parent_id,
                  message: `Parent area with ID ${dto.parent_id} not found`,
                }),
              );
            }
            if (parentArea.location_id !== dto.location_id) {
              return yield* Effect.fail(
                new AreaParentLocationMismatch({
                  parentId: dto.parent_id,
                  locationId: dto.location_id,
                  message: 'Parent area must belong to the same location',
                }),
              );
            }
          }

          const area = yield* repository.create(dto);
          return toAreaResponseDto(area);
        });

      const findAll = (
        query: AreaQueryDto,
      ): Effect.Effect<AreaResponseDto[], AreasInfrastructureError> =>
        Effect.gen(function* () {
          const areas =
            query.include_children && query.location_id
              ? yield* repository.findHierarchyByLocationId(query.location_id)
              : yield* repository.findAll(query);
          return areas.map(toAreaResponseDto);
        });

      const findById = (
        id: string,
      ): Effect.Effect<
        AreaResponseDto,
        AreaNotFound | AreasInfrastructureError
      > => Effect.map(getAreaOrFail(id), toAreaResponseDto);

      const findByIdWithChildren = (
        id: string,
      ): Effect.Effect<
        AreaResponseDto,
        AreaNotFound | AreasInfrastructureError
      > =>
        Effect.flatMap(repository.findByIdWithChildren(id), (area) =>
          area
            ? Effect.succeed(toAreaResponseDto(area))
            : Effect.fail(
                new AreaNotFound({
                  id,
                  message: `Area with ID ${id} not found`,
                }),
              ),
        );

      const update = (
        id: string,
        dto: UpdateAreaDto,
      ): Effect.Effect<
        AreaResponseDto,
        | AreaCircularReference
        | AreaNotFound
        | AreaParentLocationMismatch
        | AreasInfrastructureError
        | AreaSelfParent
        | ParentAreaNotFound
      > =>
        Effect.gen(function* () {
          const existingArea = yield* getAreaOrFail(id);

          if (dto.parent_id !== undefined && dto.parent_id !== null) {
            if (dto.parent_id === id) {
              return yield* Effect.fail(
                new AreaSelfParent({
                  id,
                  message: 'Area cannot be its own parent',
                }),
              );
            }

            const parentArea = yield* repository.findById(dto.parent_id);
            if (!parentArea) {
              return yield* Effect.fail(
                new ParentAreaNotFound({
                  parentId: dto.parent_id,
                  message: `Parent area with ID ${dto.parent_id} not found`,
                }),
              );
            }
            if (parentArea.location_id !== existingArea.location_id) {
              return yield* Effect.fail(
                new AreaParentLocationMismatch({
                  parentId: dto.parent_id,
                  locationId: existingArea.location_id,
                  message: 'Parent area must belong to the same location',
                }),
              );
            }

            const circular = yield* wouldCreateCircularReference(
              id,
              dto.parent_id,
            );
            if (circular) {
              return yield* Effect.fail(
                new AreaCircularReference({
                  id,
                  parentId: dto.parent_id,
                  message: 'Cannot set parent: would create circular reference',
                }),
              );
            }
          }

          const updated = yield* repository.update(id, dto);
          if (!updated) {
            return yield* Effect.fail(
              new AreaNotFound({
                id,
                message: `Area with ID ${id} not found`,
              }),
            );
          }
          return toAreaResponseDto(updated);
        });

      const remove = (
        id: string,
      ): Effect.Effect<void, AreaNotFound | AreasInfrastructureError> =>
        Effect.gen(function* () {
          const exists = yield* repository.existsById(id);
          if (!exists) {
            return yield* Effect.fail(
              new AreaNotFound({
                id,
                message: `Area with ID ${id} not found`,
              }),
            );
          }

          const deleted = yield* repository.delete(id);
          if (!deleted) {
            return yield* Effect.fail(
              new AreaNotFound({
                id,
                message: `Area with ID ${id} not found`,
              }),
            );
          }
        });

      return {
        create,
        findAll,
        findById,
        findByIdWithChildren,
        update,
        delete: remove,
      };
    }),
    dependencies: [AreasRepository.Default, LocationsService.Default],
  },
) {}
