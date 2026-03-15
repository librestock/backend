import { Layer } from 'effect';
import { AreasRepository, makeAreasRepository } from './repository';
import { AreasService, makeAreasService } from './service';

export const areasRepositoryLayer = Layer.effect(
  AreasRepository,
  makeAreasRepository,
);

export const areasLayer = Layer.effect(
  AreasService,
  makeAreasService,
).pipe(Layer.provide(areasRepositoryLayer));
