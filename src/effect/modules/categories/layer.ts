import { Layer } from 'effect';
import { CategoriesRepository, makeCategoriesRepository } from './repository';
import { CategoriesService, makeCategoriesService } from './service';

export const categoriesRepositoryLayer = Layer.effect(
  CategoriesRepository,
  makeCategoriesRepository,
);

export const categoriesLayer = Layer.effect(
  CategoriesService,
  makeCategoriesService,
).pipe(Layer.provide(categoriesRepositoryLayer));
