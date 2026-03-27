import { Effect } from 'effect';
import type {
  CreateLocationDto,
  UpdateLocationDto,
  LocationQueryDto,
  LocationResponseDto,
  PaginatedLocationsResponseDto,
} from '@librestock/types/locations';
import { toPaginatedResponse } from '../../platform/pagination.utils';
import type { locations } from '../../platform/db/schema';
import { toLocationResponseDto } from './locations.utils';
import {
  LocationNotFound,
  type LocationsInfrastructureError,
} from './locations.errors';
import { LocationsRepository } from './repository';

type Location = typeof locations.$inferSelect;

export class LocationsService extends Effect.Service<LocationsService>()(
  '@librestock/effect/LocationsService',
  {
    effect: Effect.gen(function* () {
      const repository = yield* LocationsRepository;

      const getLocationOrFail = (
        id: string,
      ): Effect.Effect<Location, LocationNotFound | LocationsInfrastructureError> =>
        Effect.flatMap(repository.findById(id), (location) =>
          location
            ? Effect.succeed(location)
            : Effect.fail(
                new LocationNotFound({
                  id,
                  messageKey: 'locations.notFound',
                }),
              ),
        );

      const findAllPaginated = (
        query: LocationQueryDto,
      ): Effect.Effect<PaginatedLocationsResponseDto, LocationsInfrastructureError> =>
        Effect.map(repository.findAllPaginated(query), (result) =>
          toPaginatedResponse(result, toLocationResponseDto),
        ).pipe(Effect.withSpan('LocationsService.findAllPaginated'));

      const findAll = (): Effect.Effect<LocationResponseDto[], LocationsInfrastructureError> =>
        Effect.map(repository.findAll(), (locations) =>
          locations.map(toLocationResponseDto),
        ).pipe(Effect.withSpan('LocationsService.findAll'));

      const findOne = (
        id: string,
      ): Effect.Effect<LocationResponseDto, LocationNotFound | LocationsInfrastructureError> =>
        Effect.map(getLocationOrFail(id), toLocationResponseDto).pipe(
          Effect.withSpan('LocationsService.findOne', { attributes: { id } }),
        );

      const create = (
        dto: CreateLocationDto,
      ): Effect.Effect<LocationResponseDto, LocationsInfrastructureError> =>
        Effect.map(
          repository.create({
            name: dto.name,
            type: dto.type,
            address: dto.address ?? '',
            contact_person: dto.contact_person ?? '',
            phone: dto.phone ?? '',
            is_active: dto.is_active ?? true,
          }),
          toLocationResponseDto,
        ).pipe(Effect.withSpan('LocationsService.create'));

      const update = (
        id: string,
        dto: UpdateLocationDto,
      ): Effect.Effect<LocationResponseDto, LocationNotFound | LocationsInfrastructureError> =>
        Effect.gen(function* () {
          const location = yield* getLocationOrFail(id);

          if (Object.keys(dto).length === 0) {
            return toLocationResponseDto(location);
          }

          yield* repository.update(id, dto);

          const updated = yield* getLocationOrFail(id);
          return toLocationResponseDto(updated);
        }).pipe(Effect.withSpan('LocationsService.update', { attributes: { id } }));

      const remove = (
        id: string,
      ): Effect.Effect<void, LocationNotFound | LocationsInfrastructureError> =>
        Effect.gen(function* () {
          yield* getLocationOrFail(id);
          yield* repository.delete(id);
        }).pipe(Effect.withSpan('LocationsService.delete', { attributes: { id } }));

      const existsById = (id: string) =>
        repository.existsById(id).pipe(
          Effect.withSpan('LocationsService.existsById', { attributes: { id } }),
        );

      return {
        findAllPaginated,
        findAll,
        findOne,
        create,
        update,
        delete: remove,
        existsById,
      };
    }),
    dependencies: [LocationsRepository.Default],
  },
) {}
