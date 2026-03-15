import { Layer } from 'effect';
import { PhotosRepository, makePhotosRepository } from './repository';
import { PhotosService, makePhotosService } from './service';

export const photosRepositoryLayer = Layer.effect(
  PhotosRepository,
  makePhotosRepository,
);

export const photosLayer = Layer.effect(
  PhotosService,
  makePhotosService,
).pipe(Layer.provide(photosRepositoryLayer));
