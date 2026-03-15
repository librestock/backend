import { Layer } from 'effect';
import { LocationsRepository, makeLocationsRepository } from './repository';
import { LocationsService, makeLocationsService } from './service';

export const locationsRepositoryLayer = Layer.effect(
  LocationsRepository,
  makeLocationsRepository,
);

export const locationsLayer = Layer.effect(
  LocationsService,
  makeLocationsService,
).pipe(Layer.provide(locationsRepositoryLayer));
