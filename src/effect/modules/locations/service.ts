import { Context, Effect } from 'effect';
import { toPaginatedResponse } from '../../../common/utils/pagination.utils';
import type {
  CreateLocationDto,
  UpdateLocationDto,
  LocationQueryDto,
  LocationResponseDto,
  PaginatedLocationsResponseDto,
} from '../../../routes/locations/dto';
import { locationTryAsync, toLocationResponseDto } from '../../../routes/locations/locations.utils';
import {
  LocationNotFound,
  LocationsInfrastructureError,
} from '../../../routes/locations/locations.errors';
import type { Location } from '../../../routes/locations/entities/location.entity';
import { LocationsRepository } from './repository';

export interface LocationsService {
  readonly findAllPaginated: (
    query: LocationQueryDto,
  ) => Effect.Effect<PaginatedLocationsResponseDto, LocationsInfrastructureError>;
  readonly findAll: () => Effect.Effect<LocationResponseDto[], LocationsInfrastructureError>;
  readonly findOne: (
    id: string,
  ) => Effect.Effect<LocationResponseDto, LocationNotFound | LocationsInfrastructureError>;
  readonly create: (
    dto: CreateLocationDto,
  ) => Effect.Effect<LocationResponseDto, LocationsInfrastructureError>;
  readonly update: (
    id: string,
    dto: UpdateLocationDto,
  ) => Effect.Effect<LocationResponseDto, LocationNotFound | LocationsInfrastructureError>;
  readonly delete: (
    id: string,
  ) => Effect.Effect<void, LocationNotFound | LocationsInfrastructureError>;
  readonly existsById: (id: string) => Promise<boolean>;
}

export const LocationsService = Context.GenericTag<LocationsService>(
  '@librestock/effect/LocationsService',
);

const getLocationOrFail = (
  repository: LocationsRepository,
  id: string,
): Effect.Effect<Location, LocationNotFound | LocationsInfrastructureError> =>
  Effect.flatMap(
    locationTryAsync('load location', () => repository.findById(id)),
    (location) =>
      location
        ? Effect.succeed(location)
        : Effect.fail(
            new LocationNotFound({
              id,
              message: 'Location not found',
            }),
          ),
  );

export const makeLocationsService = Effect.gen(function* () {
  const repository = yield* LocationsRepository;

  return {
    findAllPaginated: (query) =>
      Effect.map(
        locationTryAsync('list locations', () =>
          repository.findAllPaginated(query),
        ),
        (result) => toPaginatedResponse(result, toLocationResponseDto),
      ),
    findAll: () =>
      Effect.map(
        locationTryAsync('list all locations', () => repository.findAll()),
        (locations) => locations.map(toLocationResponseDto),
      ),
    findOne: (id) =>
      Effect.map(getLocationOrFail(repository, id), toLocationResponseDto),
    create: (dto) =>
      Effect.map(
        locationTryAsync('create location', () =>
          repository.create({
            name: dto.name,
            type: dto.type,
            address: dto.address ?? '',
            contact_person: dto.contact_person ?? '',
            phone: dto.phone ?? '',
            is_active: dto.is_active ?? true,
          }),
        ),
        toLocationResponseDto,
      ),
    update: (id, dto) =>
      Effect.gen(function* () {
        const location = yield* getLocationOrFail(repository, id);

        if (Object.keys(dto).length === 0) {
          return toLocationResponseDto(location);
        }

        yield* locationTryAsync('update location', () =>
          repository.update(id, dto),
        );

        const updated = yield* getLocationOrFail(repository, id);
        return toLocationResponseDto(updated);
      }),
    delete: (id) =>
      Effect.gen(function* () {
        yield* getLocationOrFail(repository, id);
        yield* locationTryAsync('delete location', () =>
          repository.delete(id),
        );
      }),
    existsById: (id) => repository.existsById(id),
  } satisfies LocationsService;
});
