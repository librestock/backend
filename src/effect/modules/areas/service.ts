import { Context, Effect } from 'effect';
import type { AreaResponseDto } from '../../../routes/areas/dto/area-response.dto';
import type { CreateAreaDto } from '../../../routes/areas/dto/create-area.dto';
import type { UpdateAreaDto } from '../../../routes/areas/dto/update-area.dto';
import type { AreaQueryDto } from '../../../routes/areas/dto/area-query.dto';
import { areaTryAsync, toAreaResponseDto } from '../../../routes/areas/areas.utils';
import {
  AreaCircularReference,
  AreaLocationNotFound,
  AreaNotFound,
  AreaParentLocationMismatch,
  AreasInfrastructureError,
  AreaSelfParent,
  ParentAreaNotFound,
} from '../../../routes/areas/areas.errors';
import { AreasRepository } from './repository';
import { LocationsService } from '../locations/service';

export interface AreasService {
  readonly create: (
    dto: CreateAreaDto,
  ) => Effect.Effect<
    AreaResponseDto,
    | AreaLocationNotFound
    | AreaParentLocationMismatch
    | AreasInfrastructureError
    | ParentAreaNotFound
  >;
  readonly findAll: (
    query: AreaQueryDto,
  ) => Effect.Effect<AreaResponseDto[], AreasInfrastructureError>;
  readonly findById: (
    id: string,
  ) => Effect.Effect<AreaResponseDto, AreaNotFound | AreasInfrastructureError>;
  readonly findByIdWithChildren: (
    id: string,
  ) => Effect.Effect<AreaResponseDto, AreaNotFound | AreasInfrastructureError>;
  readonly update: (
    id: string,
    dto: UpdateAreaDto,
  ) => Effect.Effect<
    AreaResponseDto,
    | AreaCircularReference
    | AreaNotFound
    | AreaParentLocationMismatch
    | AreasInfrastructureError
    | AreaSelfParent
    | ParentAreaNotFound
  >;
  readonly delete: (
    id: string,
  ) => Effect.Effect<void, AreaNotFound | AreasInfrastructureError>;
}

export const AreasService = Context.GenericTag<AreasService>(
  '@librestock/effect/AreasService',
);

export const makeAreasService = Effect.gen(function* () {
  const repository = yield* AreasRepository;
  const locationsService = yield* LocationsService;

  const getAreaOrFail = (id: string) =>
    Effect.flatMap(
      areaTryAsync('load area', () => repository.findById(id)),
      (area) =>
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
        const parent = yield* areaTryAsync('load ancestor area', () =>
          repository.findById(currentId!),
        );
        currentId = parent?.parent_id ?? null;
      }

      return false;
    });

  return {
    create: (dto) =>
      Effect.gen(function* () {
        const locationExists = yield* areaTryAsync(
          'check location existence',
          () => locationsService.existsById(dto.location_id),
        );
        if (!locationExists) {
          return yield* Effect.fail(
            new AreaLocationNotFound({
              locationId: dto.location_id,
              message: `Location with ID ${dto.location_id} not found`,
            }),
          );
        }

        if (dto.parent_id) {
          const parentArea = yield* areaTryAsync('load parent area', () =>
            repository.findById(dto.parent_id!),
          );
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

        const area = yield* areaTryAsync('create area', () =>
          repository.create(dto),
        );
        return toAreaResponseDto(area);
      }),
    findAll: (query) =>
      Effect.map(
        areaTryAsync('list areas', async () => {
          if (query.include_children && query.location_id) {
            return repository.findHierarchyByLocationId(query.location_id);
          }
          return repository.findAll(query);
        }),
        (areas) => areas.map(toAreaResponseDto),
      ),
    findById: (id) =>
      Effect.map(getAreaOrFail(id), toAreaResponseDto),
    findByIdWithChildren: (id) =>
      Effect.flatMap(
        areaTryAsync('load area with children', () =>
          repository.findByIdWithChildren(id),
        ),
        (area) =>
          area
            ? Effect.succeed(toAreaResponseDto(area))
            : Effect.fail(
                new AreaNotFound({
                  id,
                  message: `Area with ID ${id} not found`,
                }),
              ),
      ),
    update: (id, dto) =>
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

          const parentArea = yield* areaTryAsync('load parent area', () =>
            repository.findById(dto.parent_id!),
          );
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

        const updated = yield* areaTryAsync('update area', () =>
          repository.update(id, dto),
        );
        if (!updated) {
          return yield* Effect.fail(
            new AreaNotFound({
              id,
              message: `Area with ID ${id} not found`,
            }),
          );
        }
        return toAreaResponseDto(updated);
      }),
    delete: (id) =>
      Effect.gen(function* () {
        const exists = yield* areaTryAsync('check area existence', () =>
          repository.existsById(id),
        );
        if (!exists) {
          return yield* Effect.fail(
            new AreaNotFound({
              id,
              message: `Area with ID ${id} not found`,
            }),
          );
        }

        const deleted = yield* areaTryAsync('delete area', () =>
          repository.delete(id),
        );
        if (!deleted) {
          return yield* Effect.fail(
            new AreaNotFound({
              id,
              message: `Area with ID ${id} not found`,
            }),
          );
        }
      }),
  } satisfies AreasService;
});
